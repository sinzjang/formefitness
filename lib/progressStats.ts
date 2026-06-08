// Progress 탭 — 스트릭·월간 통계 (플레이스홀더용)
import type { WorkoutDayInfo } from '../stores/historyStore';
import { toLocalDateKey } from './dates';

export function calcCurrentStreak(
  dayMap: Record<string, WorkoutDayInfo>,
  anchor: Date = new Date()
): number {
  let streak = 0;
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);

  while (dayMap[toLocalDateKey(d)]?.workedOut) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

export function countWorkoutsInMonth(
  dayMap: Record<string, WorkoutDayInfo>,
  viewMonth: Date
): number {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  let count = 0;

  for (const [key, info] of Object.entries(dayMap)) {
    if (!info.workedOut) continue;
    const [y, m] = key.split('-').map(Number);
    if (y === year && m - 1 === month) count += 1;
  }

  return count;
}

export function countWorkoutsOnDate(
  sessions: { endedAt: string }[],
  date: Date
): number {
  const key = toLocalDateKey(date);
  return sessions.filter((s) => toLocalDateKey(new Date(s.endedAt)) === key).length;
}
