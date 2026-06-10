// 세션 시작·종료 시각 편집 헬퍼
import type { Language, SavedWorkoutSession } from '../types';

export function toLocalDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toLocalTimeInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

/** YYYY-MM-DD + HH:mm → 로컬 Date */
export function combineLocalDateTime(dateStr: string, timeStr: string): Date | null {
  const dateMatch = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;

  const y = Number(dateMatch[1]);
  const mo = Number(dateMatch[2]) - 1;
  const d = Number(dateMatch[3]);
  const h = Number(timeMatch[1]);
  const min = Number(timeMatch[2]);

  if (mo < 0 || mo > 11 || d < 1 || d > 31 || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }

  const dt = new Date(y, mo, d, h, min, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo ||
    dt.getDate() !== d ||
    dt.getHours() !== h ||
    dt.getMinutes() !== min
  ) {
    return null;
  }
  return dt;
}

export function sessionDurationSeconds(startedAt: string, endedAt: string): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function resolveSessionStartedAt(session: SavedWorkoutSession): string {
  if (session.startedAt) {
    const t = new Date(session.startedAt).getTime();
    if (!Number.isNaN(t)) return session.startedAt;
  }
  return session.endedAt;
}

export function formatSessionTimeRange(session: SavedWorkoutSession, lang: Language): string {
  const end = new Date(session.endedAt);
  if (Number.isNaN(end.getTime())) return '—';

  const endLabel = end.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!session.startedAt) return endLabel;

  const start = new Date(session.startedAt);
  if (Number.isNaN(start.getTime())) return endLabel;

  const startLabel = start.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${startLabel} → ${endLabel}`;
}
