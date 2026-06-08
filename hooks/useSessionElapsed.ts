// 세션 경과 시간 — 1초마다 갱신 (일시정지 반영)
import { useEffect, useState } from 'react';
import { getSessionElapsedSeconds } from '../lib/sessionTime';
import { useWorkoutStore } from '../stores/workoutStore';

export function useSessionElapsed(): number {
  const session = useWorkoutStore((s) => s.session);
  const isPaused = useWorkoutStore((s) => s.sessionPaused);
  const pausedAtMs = useWorkoutStore((s) => s.sessionPausedAtMs);
  const accumulatedPauseMs = useWorkoutStore((s) => s.sessionAccumulatedPauseMs);

  const [elapsed, setElapsed] = useState(() =>
    getSessionElapsedSeconds(session, {
      isPaused,
      pausedAtMs,
      accumulatedPauseMs,
    })
  );

  useEffect(() => {
    const update = () =>
      setElapsed(
        getSessionElapsedSeconds(session, {
          isPaused,
          pausedAtMs,
          accumulatedPauseMs,
        })
      );
    update();

    if (!session?.runningStartedAt || isPaused) return;

    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [session?.runningStartedAt, isPaused, pausedAtMs, accumulatedPauseMs, session]);

  return elapsed;
}
