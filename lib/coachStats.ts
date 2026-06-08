// AI 코치용 사용자 데이터 집계 (히스토리·루틴 → 컨텍스트)
import type { FatigueLevel, Language, MuscleGroup, SavedWorkoutSession, WorkoutRoutine } from '../types';
import { getFatigueLevel } from './fatigue';
import { summarizeSets } from './sessionStats';
import { getCurrentWeekDays, isoToLocalDateKey, toLocalDateKey } from './dates';

const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'shoulder', 'back', 'arms', 'core', 'legs'];
const WEEKLY_GOAL = 5;
const HISTORY_DAYS = 3;

export interface CoachCustomRoutine {
  id: string;
  name: string;
  exercises: {
    name: string;
    muscleGroup: MuscleGroup;
    type: 'compound' | 'isolation';
  }[];
}

export interface CoachContextData {
  goalTier: number;
  fatigueState: Record<MuscleGroup, FatigueLevel>;
  lastSession: object | null;
  historyContext: object[];
  prRecords: Record<string, { weight: number; date: string }>;
  weeklyStats: {
    sessionsThisWeek: number;
    goalSessions: number;
    totalVolume: number;
    mostWorkedMuscle: MuscleGroup | null;
  };
  customRoutines: CoachCustomRoutine[];
  conditionSleep: number;
  conditionFatigue: number;
}

/** 최근 N일 세션에서 근육별 완료 세트 수 → 피로 상태 */
function buildFatigueFromSessions(sessions: SavedWorkoutSession[]): Record<MuscleGroup, FatigueLevel> {
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
      counts[ex.muscleGroup] += done;
    }
  }

  return MUSCLE_GROUPS.reduce(
    (acc, mg) => {
      acc[mg] = getFatigueLevel(mg, counts[mg]);
      return acc;
    },
    {} as Record<MuscleGroup, FatigueLevel>
  );
}

function summarizeSession(session: SavedWorkoutSession, lang: Language) {
  const exercises = session.exercises.map((ex) => {
    const stats = summarizeSets(ex.sets, ex.resistanceType);
    return {
      name: ex.exerciseName[lang],
      muscleGroup: ex.muscleGroup,
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
      const key = ex.exerciseName[lang];
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

function buildWeeklyStats(sessions: SavedWorkoutSession[]) {
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
      muscleCounts[ex.muscleGroup] += ex.sets.filter((s) => s.reps > 0).length;
    }
  }

  const mostWorkedMuscle =
    (Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0) > 0
      ? (Object.entries(muscleCounts).sort((a, b) => b[1] - a[1])[0][0] as MuscleGroup)
      : null;

  return {
    sessionsThisWeek,
    goalSessions: WEEKLY_GOAL,
    totalVolume: Math.round(totalVolume),
    mostWorkedMuscle,
  };
}

function useHistoryDayMap(sessions: SavedWorkoutSession[]) {
  const map: Record<string, { workedOut: boolean; muscles: MuscleGroup[] }> = {};
  for (const session of sessions) {
    const key = isoToLocalDateKey(session.endedAt);
    const muscles = [...new Set(session.exercises.map((e) => e.muscleGroup))];
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
  return routines.map((r) => ({
    id: r.id,
    name: r.name,
    exercises: r.exercises.map((ex) => ({
      name: ex.exerciseName[lang],
      muscleGroup: ex.muscleGroup,
      type: 'compound' as const,
    })),
  }));
}

export function buildCoachContextData(
  sessions: SavedWorkoutSession[],
  routines: WorkoutRoutine[],
  lang: Language,
  options?: { goalTier?: number; conditionSleep?: number; conditionFatigue?: number }
): CoachContextData {
  const sorted = [...sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const lastSession = sorted[0] ? summarizeSession(sorted[0], lang) : null;
  const historyContext = sorted.slice(0, 10).map((s) => summarizeSession(s, lang));

  return {
    goalTier: options?.goalTier ?? 3,
    fatigueState: buildFatigueFromSessions(sorted),
    lastSession,
    historyContext,
    prRecords: buildPrRecords(sorted, lang),
    weeklyStats: buildWeeklyStats(sorted),
    customRoutines: toCustomRoutines(routines, lang),
    conditionSleep: options?.conditionSleep ?? 3,
    conditionFatigue: options?.conditionFatigue ?? 3,
  };
}
