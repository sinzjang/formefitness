// 최근 7일 운동 히스토리 — 날짜별 그룹
import type { Language, SavedWorkoutSession } from '../types';
import { isoToLocalDateKey, toLocalDateKey, weekdayLabels } from './dates';
import { summarizeSets } from './sessionStats';

export interface RecentDayGroup {
  dateKey: string;
  date: Date;
  sessions: SavedWorkoutSession[];
}

/** 오늘 포함 최근 7일 (오늘 → 6일 전) */
export function getRecent7DayKeys(anchor: Date = new Date()): string[] {
  const base = new Date(anchor);
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    return toLocalDateKey(d);
  });
}

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 세션을 최근 7일 버킷에 배치 */
export function groupSessionsByRecent7Days(
  sessions: SavedWorkoutSession[],
  anchor: Date = new Date()
): RecentDayGroup[] {
  const keys = getRecent7DayKeys(anchor);
  const buckets = new Map<string, SavedWorkoutSession[]>();
  for (const key of keys) buckets.set(key, []);

  for (const session of sessions) {
    const key = isoToLocalDateKey(session.endedAt);
    const list = buckets.get(key);
    if (list) list.push(session);
  }

  return keys.map((dateKey) => ({
    dateKey,
    date: dateFromKey(dateKey),
    sessions: (buckets.get(dateKey) ?? []).sort((a, b) => b.endedAt.localeCompare(a.endedAt)),
  }));
}

export interface RecentDayLabel {
  primary: string;
  secondary: string;
  isToday: boolean;
}

export function formatRecentDayLabel(
  date: Date,
  lang: Language,
  labels: { today: string; yesterday: string }
): RecentDayLabel {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  const weekday = weekdayLabels(lang)[(date.getDay() + 6) % 7];

  if (diffDays === 0) {
    return { primary: labels.today, secondary: weekday, isToday: true };
  }
  if (diffDays === 1) {
    return { primary: labels.yesterday, secondary: weekday, isToday: false };
  }

  const datePart =
    lang === 'ko'
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { primary: weekday, secondary: datePart, isToday: false };
}

export function formatSessionTime(iso: string, lang: Language): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** 세션 내 운동별 완료 세트 수 */
export function sessionExerciseSetCount(session: SavedWorkoutSession): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.reps > 0).length,
    0
  );
}

/** 세션 총 볼륨 (lb) */
export function sessionTotalVolume(session: SavedWorkoutSession): number {
  return session.exercises.reduce((sum, ex) => {
    const stats = summarizeSets(ex.sets, ex.resistanceType);
    return sum + stats.totalVolume;
  }, 0);
}
