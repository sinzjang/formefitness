// AI 코치용 사용자 데이터 집계 (히스토리·루틴 → 컨텍스트)
import type {
  FatigueLevel,
  Language,
  MuscleGroup,
  RoutineExerciseEntry,
  SavedWorkoutSession,
  WorkoutRoutine,
  WorkoutSession,
} from '../types';
import type { BodyProfileAnalysis } from '../types/bodyProfile';
import { getFatigueLevel } from './fatigue';
import { summarizeSets } from './sessionStats';
import { getCurrentWeekDays, isoToLocalDateKey, toLocalDateKey } from './dates';
import { resolveDisplayExerciseName } from './exerciseKo';
import { normalizeMuscleGroup } from './workoutHistoryIntegrity';
import { muscleGroupLabel } from '../constants/muscles';

const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'shoulder', 'back', 'arms', 'core', 'legs'];
const WEEKLY_GOAL = 5;
const HISTORY_DAYS = 3;

export interface CoachCustomRoutine {
  id: string;
  name: string;
  exercises: {
    name: string;
    muscleGroup: string;
    type: 'compound' | 'isolation';
  }[];
}

export interface CoachWorkoutPlan {
  /** 데이터 출처 — 코치가 어떤 맥락인지 구분 */
  source: 'active_session' | 'viewing_routine' | 'draft_routine';
  status?: 'preparing' | 'running' | 'paused';
  routineId?: string;
  routineName?: string;
  locationId?: string;
  exercises: {
    name: string;
    muscleGroup: string;
    setCount?: number;
    completedSets?: number;
  }[];
  muscleSummary: string[];
}

/** @deprecated CoachWorkoutPlan 사용 */
export type CoachActiveSession = CoachWorkoutPlan;

export interface CoachRoutineSnapshot {
  routineId?: string;
  routineName: string;
  exercises: { name: string; muscleGroup: string }[];
  muscleSummary: string[];
}

export interface CoachContextData {
  goalTier: number;
  fatigueState: Record<string, FatigueLevel>;
  /** 오늘 세션 / 열람 중 루틴 / 작성 중 루틴 */
  activeSession: CoachWorkoutPlan | null;
  lastSession: object | null;
  historyContext: object[];
  prRecords: Record<string, { weight: number; date: string }>;
  weeklyStats: {
    sessionsThisWeek: number;
    goalSessions: number;
    totalVolume: number;
    mostWorkedMuscle: string | null;
  };
  bodyProfile: BodyProfileAnalysis | null;
  customRoutines: CoachCustomRoutine[];
  conditionSleep: number;
  conditionFatigue: number;
}

/** 코치 컨텍스트용 근육 그룹 라벨 */
function coachMuscleLabel(mg: MuscleGroup | unknown, lang: Language): string {
  const safe = normalizeMuscleGroup(mg);
  return lang === 'ko' ? muscleGroupLabel(safe, 'ko') : safe;
}

/** 최근 N일 세션에서 근육별 완료 세트 수 → 피로 상태 (코치용 라벨) */
function buildFatigueForCoach(
  sessions: SavedWorkoutSession[],
  lang: Language
): Record<string, FatigueLevel> {
  const counts: Record<MuscleGroup, number> = {
    chest: 0,
    shoulder: 0,
    back: 0,
    arms: 0,
    core: 0,
    legs: 0,
  };

  const cutoff = Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000;

  for (const session of sessions) {
    if (new Date(session.endedAt).getTime() < cutoff) continue;
    for (const ex of session.exercises) {
      const done = ex.sets.filter((s) => s.completed || s.reps > 0).length;
      counts[normalizeMuscleGroup(ex.muscleGroup)] += done;
    }
  }

  return MUSCLE_GROUPS.reduce(
    (acc, mg) => {
      const label = coachMuscleLabel(mg, lang);
      acc[label] = getFatigueLevel(mg, counts[mg]);
      return acc;
    },
    {} as Record<string, FatigueLevel>
  );
}

function summarizeSession(session: SavedWorkoutSession, lang: Language) {
  const exercises = session.exercises.map((ex) => {
    const stats = summarizeSets(ex.sets, ex.resistanceType);
    return {
      name: resolveDisplayExerciseName(ex.exerciseName, lang),
      muscleGroup: coachMuscleLabel(ex.muscleGroup, lang),
      sets: ex.sets.filter((s) => s.reps > 0).length,
      maxWeight: stats.bestE1rm,
      totalVolume: stats.totalVolume,
    };
  });

  const totalVolume = exercises.reduce((sum, e) => sum + e.totalVolume, 0);

  return {
    date: session.endedAt.slice(0, 10),
    exercises,
    totalVolume,
    exerciseCount: exercises.length,
  };
}

function buildPrRecords(sessions: SavedWorkoutSession[], lang: Language) {
  const pr: Record<string, { weight: number; date: string }> = {};

  for (const session of sessions) {
    for (const ex of session.exercises) {
      const stats = summarizeSets(ex.sets, ex.resistanceType);
      if (!stats.hasLoad || stats.bestE1rm <= 0) continue;
      const key = resolveDisplayExerciseName(ex.exerciseName, lang);
      const prev = pr[key];
      if (!prev || stats.bestE1rm > prev.weight) {
        pr[key] = { weight: stats.bestE1rm, date: session.endedAt.slice(0, 10) };
      }
    }
  }

  return pr;
}

function countWorkoutsThisWeek(dayMap: Record<string, { workedOut: boolean }>): number {
  const weekKeys = getCurrentWeekDays().map(toLocalDateKey);
  return weekKeys.filter((key) => dayMap[key]?.workedOut).length;
}

function buildWeeklyStats(sessions: SavedWorkoutSession[], lang: Language) {
  const dayMap = useHistoryDayMap(sessions);
  const sessionsThisWeek = countWorkoutsThisWeek(dayMap);

  const weekStart = getWeekStart();
  let totalVolume = 0;
  const muscleCounts: Record<MuscleGroup, number> = {
    chest: 0,
    shoulder: 0,
    back: 0,
    arms: 0,
    core: 0,
    legs: 0,
  };

  for (const session of sessions) {
    if (new Date(session.endedAt) < weekStart) continue;
    for (const ex of session.exercises) {
      const stats = summarizeSets(ex.sets, ex.resistanceType);
      totalVolume += stats.totalVolume;
      muscleCounts[normalizeMuscleGroup(ex.muscleGroup)] += ex.sets.filter((s) => s.reps > 0).length;
    }
  }

  const mostWorkedMuscleId =
    (Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0) > 0
      ? (Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0][0] as MuscleGroup)
      : null;

  return {
    sessionsThisWeek,
    goalSessions: WEEKLY_GOAL,
    totalVolume: Math.round(totalVolume),
    mostWorkedMuscle: mostWorkedMuscleId ? coachMuscleLabel(mostWorkedMuscleId, lang) : null,
  };
}

function useHistoryDayMap(sessions: SavedWorkoutSession[]) {
  const map: Record<string, { workedOut: boolean; muscles: MuscleGroup[] }> = {};
  for (const session of sessions) {
    const key = isoToLocalDateKey(session.endedAt);
    const muscles = [...new Set(session.exercises.map((e) => normalizeMuscleGroup(e.muscleGroup)))];
    map[key] = { workedOut: true, muscles };
  }
  return map;
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diff);
  return monday;
}

function toCustomRoutines(routines: WorkoutRoutine[], lang: Language): CoachCustomRoutine[] {
  return routines
    .filter((r) => r.is_active !== false)
    .map((r) => ({
      id: r.id,
      name: r.name,
      exercises: r.exercises.map((ex) => ({
        name: resolveDisplayExerciseName(ex.exerciseName, lang),
        muscleGroup: coachMuscleLabel(ex.muscleGroup, lang),
        type: 'compound' as const,
      })),
    }));
}

function buildMuscleSummary(muscleCounts: Record<string, number>): string[] {
  return Object.entries(muscleCounts).map(([mg, n]) => `${mg} x${n}`);
}

/** 저장된 루틴 → 코치 스냅샷 */
export function snapshotFromWorkoutRoutine(
  routine: WorkoutRoutine,
  lang: Language
): CoachRoutineSnapshot {
  const muscleCounts: Record<string, number> = {};
  const exercises = routine.exercises.map((ex) => {
    const mgLabel = coachMuscleLabel(ex.muscleGroup, lang);
    muscleCounts[mgLabel] = (muscleCounts[mgLabel] ?? 0) + 1;
    return {
      name: resolveDisplayExerciseName(ex.exerciseName, lang),
      muscleGroup: mgLabel,
    };
  });
  return {
    routineId: routine.id,
    routineName: routine.name,
    exercises,
    muscleSummary: buildMuscleSummary(muscleCounts),
  };
}

/** 루틴 작성 중 → 코치 스냅샷 */
export function snapshotFromRoutineEntries(
  routineName: string,
  entries: RoutineExerciseEntry[],
  lang: Language,
  routineId?: string
): CoachRoutineSnapshot {
  const muscleCounts: Record<string, number> = {};
  const exercises = entries.map((ex) => {
    const mgLabel = coachMuscleLabel(ex.muscleGroup, lang);
    muscleCounts[mgLabel] = (muscleCounts[mgLabel] ?? 0) + 1;
    return {
      name: resolveDisplayExerciseName(ex.exerciseName, lang),
      muscleGroup: mgLabel,
    };
  });
  return {
    routineId,
    routineName,
    exercises,
    muscleSummary: buildMuscleSummary(muscleCounts),
  };
}

/** 진행 중·준비 중 세션 → 코치용 스냅샷 */
export function summarizeActiveSession(
  session: WorkoutSession | null | undefined,
  routines: WorkoutRoutine[],
  lang: Language,
  sessionPaused?: boolean
): CoachWorkoutPlan | null {
  if (!session || session.exercises.length === 0) return null;

  const routine = session.routineId
    ? routines.find((r) => r.id === session.routineId)
    : undefined;

  const muscleCounts: Record<string, number> = {};
  const exercises = session.exercises.map((ex) => {
    const mgLabel = coachMuscleLabel(ex.muscleGroup, lang);
    muscleCounts[mgLabel] = (muscleCounts[mgLabel] ?? 0) + 1;
    const completedSets = ex.sets.filter((s) => s.completed || s.reps > 0).length;
    return {
      name: resolveDisplayExerciseName(ex.exerciseName, lang),
      muscleGroup: mgLabel,
      setCount: ex.sets.length,
      completedSets,
    };
  });

  const muscleSummary = buildMuscleSummary(muscleCounts);

  let status: CoachWorkoutPlan['status'] = 'preparing';
  if (session.runningStartedAt) {
    status = sessionPaused ? 'paused' : 'running';
  }

  return {
    source: 'active_session',
    status,
    routineId: session.routineId,
    routineName: routine?.name,
    locationId: session.locationId,
    exercises,
    muscleSummary,
  };
}

/** 세션 > 작성 중 루틴 > 열람 중 루틴 순으로 코치용 플랜 선택 */
export function buildCoachWorkoutPlan(
  lang: Language,
  routines: WorkoutRoutine[],
  options: {
    activeSession?: WorkoutSession | null;
    sessionPaused?: boolean;
    viewingRoutine?: CoachRoutineSnapshot | null;
    draftRoutine?: CoachRoutineSnapshot | null;
  }
): CoachWorkoutPlan | null {
  const active = summarizeActiveSession(
    options.activeSession,
    routines,
    lang,
    options.sessionPaused
  );
  if (active) return active;

  if (options.draftRoutine && options.draftRoutine.exercises.length > 0) {
    return {
      source: 'draft_routine',
      routineId: options.draftRoutine.routineId,
      routineName: options.draftRoutine.routineName,
      exercises: options.draftRoutine.exercises,
      muscleSummary: options.draftRoutine.muscleSummary,
    };
  }

  if (options.viewingRoutine && options.viewingRoutine.exercises.length > 0) {
    return {
      source: 'viewing_routine',
      routineId: options.viewingRoutine.routineId,
      routineName: options.viewingRoutine.routineName,
      exercises: options.viewingRoutine.exercises,
      muscleSummary: options.viewingRoutine.muscleSummary,
    };
  }

  return null;
}

export function buildCoachContextData(
  sessions: SavedWorkoutSession[],
  routines: WorkoutRoutine[],
  lang: Language,
  options?: {
    goalTier?: number;
    conditionSleep?: number;
    conditionFatigue?: number;
    activeSession?: WorkoutSession | null;
    sessionPaused?: boolean;
    viewingRoutine?: CoachRoutineSnapshot | null;
    draftRoutine?: CoachRoutineSnapshot | null;
    bodyProfile?: BodyProfileAnalysis | null;
  }
): CoachContextData {
  const sorted = [...sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const lastSession = sorted[0] ? summarizeSession(sorted[0], lang) : null;
  const historyContext = sorted.slice(0, 10).map((s) => summarizeSession(s, lang));

  return {
    goalTier: options?.goalTier ?? 3,
    fatigueState: buildFatigueForCoach(sorted, lang),
    activeSession: buildCoachWorkoutPlan(lang, routines, {
      activeSession: options?.activeSession,
      sessionPaused: options?.sessionPaused,
      viewingRoutine: options?.viewingRoutine,
      draftRoutine: options?.draftRoutine,
    }),
    lastSession,
    historyContext,
    prRecords: buildPrRecords(sorted, lang),
    weeklyStats: buildWeeklyStats(sorted, lang),
    bodyProfile: options?.bodyProfile ?? null,
    customRoutines: toCustomRoutines(routines, lang),
    conditionSleep: options?.conditionSleep ?? 3,
    conditionFatigue: options?.conditionFatigue ?? 3,
  };
}
