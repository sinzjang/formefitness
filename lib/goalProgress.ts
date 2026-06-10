// Goal 스크린 — D+N, 진행률, 사진 간격 경고
import type { GoalCheckin } from '../types/goal';
import type { Language } from '../types';
import type { SavedWorkoutSession } from '../types';
import { t } from './i18n';

export const PHOTO_WARNING_DAYS = 14;
export const PHOTO_RECOMMEND_DAYS = 30;

/** Goal 시작일 기준 경과 일수 (D+N) */
export function calcDayIndex(setupAt: string, refDate: Date = new Date()): number {
  const start = new Date(setupAt).getTime();
  const diff = refDate.getTime() - start;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** 목표 타임라인 대비 진행률 (0~100) */
export function calcProgressPct(dayIndex: number, timelineMonths: number): number {
  const totalDays = Math.max(timelineMonths * 30, 1);
  return Math.min(100, Math.round((dayIndex / totalDays) * 100));
}

export function formatGoalDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export type DateWarningType = 'warning' | 'info';

export interface DateWarning {
  type: DateWarningType;
  message: string;
}

/** 두 체크인 사진 간격 경고 */
export function getDateWarning(
  prevDate: string,
  currentDate: string,
  lang: Language
): DateWarning | null {
  const days = Math.floor(
    (new Date(currentDate).getTime() - new Date(prevDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days < PHOTO_WARNING_DAYS) {
    return {
      type: 'warning',
      message: t('goalScreenDateWarningShort', lang).replace('{days}', String(days)),
    };
  }

  if (days >= 90) {
    return {
      type: 'info',
      message: t('goalScreenDateInfoLong', lang).replace('{days}', String(days)),
    };
  }

  return null;
}

/** 체크인 목록 정렬 (오래된 → 최신) */
export function sortCheckins(checkins: GoalCheckin[]): GoalCheckin[] {
  return [...checkins].sort(
    (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
  );
}

/** 기간 내 운동 세션 필터 */
export function filterSessionsBetween(
  sessions: SavedWorkoutSession[],
  startIso: string,
  endIso: string
): SavedWorkoutSession[] {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return sessions.filter((s) => {
    const t = new Date(s.startedAt ?? s.endedAt).getTime();
    return t >= start && t <= end;
  });
}

/** 세션에서 상위 근육 그룹 (빈도) */
export function getTopMuscleGroups(sessions: SavedWorkoutSession[], limit = 3): string[] {
  const counts: Record<string, number> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      const g = ex.muscleGroup ?? 'other';
      counts[g] = (counts[g] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([g]) => g);
}
