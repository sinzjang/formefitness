// 세션 경과 시간 — 일시정지 구간 제외
import type { WorkoutSession } from '../types';

export interface SessionPauseState {
  isPaused: boolean;
  pausedAtMs: number | null;
  accumulatedPauseMs: number;
}

export function getSessionElapsedSeconds(
  session: WorkoutSession | null,
  pause: SessionPauseState
): number {
  if (!session?.runningStartedAt) return 0;

  const startMs = new Date(session.runningStartedAt).getTime();
  let pauseTotal = pause.accumulatedPauseMs;
  if (pause.isPaused && pause.pausedAtMs != null) {
    pauseTotal += Date.now() - pause.pausedAtMs;
  }

  return Math.max(0, Math.floor((Date.now() - startMs - pauseTotal) / 1000));
}

export function formatSessionTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
