// Home 대시보드 — 주간 부위별 세트·최근 세션 집계
import type { MuscleGroup, SavedWorkoutSession } from '../types';
import { FATIGUE_THRESHOLDS } from './fatigue';
import { normalizeMuscleGroup } from './workoutHistoryIntegrity';

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diff);
  return monday;
}

const MUSCLE_GROUPS: MuscleGroup[] = ['chest', 'shoulder', 'back', 'arms', 'core', 'legs'];

function emptyCounts(): Record<MuscleGroup, number> {
  return { chest: 0, shoulder: 0, back: 0, arms: 0, core: 0, legs: 0 };
}

/** 이번 주 근육 그룹별 완료 세트 수 */
export function getWeeklyMuscleSetCounts(
  sessions: SavedWorkoutSession[]
): Record<MuscleGroup, number> {
  const counts = emptyCounts();
  const weekStart = getWeekStart();

  for (const session of sessions) {
    if (new Date(session.endedAt) < weekStart) continue;
    for (const ex of session.exercises) {
      counts[normalizeMuscleGroup(ex.muscleGroup)] += ex.sets.filter((s) => s.reps > 0).length;
    }
  }

  return counts;
}

/** 주간 목표 대비 0~1 진행률 (overload 임계값 기준) */
export function getMuscleWeeklyProgress(
  group: MuscleGroup,
  setCount: number
): number {
  const cap = FATIGUE_THRESHOLDS[group].overload;
  if (cap <= 0) return 0;
  return Math.min(setCount / cap, 1);
}

/** 가장 최근 세션에서 사용한 근육 그룹 */
export function getLastSessionMuscleGroups(sessions: SavedWorkoutSession[]): MuscleGroup[] {
  const sorted = [...sessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
  const last = sorted[0];
  if (!last) return [];
  return [...new Set(last.exercises.map((e) => normalizeMuscleGroup(e.muscleGroup)))];
}

export { MUSCLE_GROUPS as HOME_MUSCLE_GROUPS };
