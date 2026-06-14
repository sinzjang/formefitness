// 완료된 운동 세션 로컬 저장 (AsyncStorage 영속)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MuscleGroup, SavedWorkoutSession, WorkoutSession } from '../types';
import { getExerciseKey } from '../lib/exerciseKey';
import { summarizeSets } from '../lib/sessionStats';
import { isoToLocalDateKey } from '../lib/dates';
import { sanitizeSavedWorkoutSessions, normalizeMuscleGroup } from '../lib/workoutHistoryIntegrity';

const MAX_SESSIONS = 200;

/** 날짜별 운동 여부 + 해당일 근육 그룹 */
export interface WorkoutDayInfo {
  workedOut: boolean;
  muscles: MuscleGroup[];
}

export interface ExerciseSessionPoint {
  sessionId: string;
  date: string;
  bestE1rm: number;
  bestReps: number;
  totalVolume: number;
  totalReps: number;
  hasLoad: boolean;
}

interface HistoryState {
  sessions: SavedWorkoutSession[];
  saveSession: (session: WorkoutSession) => void;
  saveManualSession: (date: Date) => void;
  /** 달력에서 진입한 수동 세션 저장 — hasData 체크 없이, startedAt 기준 날짜 유지 */
  saveManualLog: (session: WorkoutSession) => void;
  importBulk: (sessions: SavedWorkoutSession[]) => void;
  replaceAll: (sessions: SavedWorkoutSession[]) => void;
  updateSessionTimes: (id: string, startedAt: string, endedAt: string) => void;
  getExerciseHistory: (exerciseKey: string) => ExerciseSessionPoint[];
  getWorkoutDayMap: () => Record<string, WorkoutDayInfo>;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      sessions: [],

      saveSession: (session) => {
        const hasData = session.exercises.some((ex) =>
          ex.sets.some((s) => s.reps > 0 || s.completed)
        );
        if (!hasData) return;

        const endedAt = session.endedAt ?? new Date().toISOString();
        const startedAt =
          session.runningStartedAt ?? session.startedAt ?? endedAt;

        const saved: SavedWorkoutSession = {
          id: session.id,
          startedAt,
          endedAt,
          locationId: session.locationId,
          routineId: session.routineId,
          exercises: session.exercises.map((ex) => ({
            exerciseKey: getExerciseKey(ex.exerciseName, ex.customId),
            exerciseName: ex.exerciseName,
            muscleGroup: ex.muscleGroup,
            resistanceType: ex.resistanceType,
            sets: ex.sets,
          })),
        };

        set((state) => ({
          sessions: [saved, ...state.sessions.filter((s) => s.id !== saved.id)].slice(
            0,
            MAX_SESSIONS
          ),
        }));
        void import('../lib/sync/workoutSync').then((m) => m.pushSession(saved));
      },

      saveManualLog: (session) => {
        // 달력에서 선택한 날짜의 정오를 startedAt/endedAt으로 사용
        const startedAt = session.startedAt ?? new Date().toISOString();
        const endedAt = session.endedAt ?? startedAt;

        const saved: SavedWorkoutSession = {
          id: session.id,
          startedAt,
          endedAt,
          locationId: session.locationId,
          routineId: undefined,
          exercises: session.exercises.map((ex) => {
            // reps가 기록된 세트만 포함 — 없으면 completed:true 마커 세트 1개 생성
            const validSets = ex.sets.filter((s) => s.reps > 0 || s.completed);
            const sets: typeof ex.sets =
              validSets.length > 0
                ? validSets
                : [{ setNumber: 1, reps: 0, completed: true }];
            return {
              exerciseKey: getExerciseKey(ex.exerciseName, ex.customId),
              exerciseName: ex.exerciseName,
              muscleGroup: ex.muscleGroup,
              resistanceType: ex.resistanceType,
              sets,
            };
          }),
        };

        set((state) => ({
          sessions: [saved, ...state.sessions.filter((s) => s.id !== saved.id)].slice(
            0,
            MAX_SESSIONS
          ),
        }));
        void import('../lib/sync/workoutSync').then((m) => m.pushSession(saved));
      },

      saveManualSession: (date) => {
        const dateStr = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0).toISOString();
        const saved: SavedWorkoutSession = {
          id: `manual_${dateStr}`,
          startedAt: dateStr,
          endedAt: dateStr,
          locationId: undefined,
          routineId: undefined,
          exercises: [],
        };
        set((state) => ({
          sessions: [saved, ...state.sessions.filter((s) => s.id !== saved.id)].slice(0, MAX_SESSIONS),
        }));
        void import('../lib/sync/workoutSync').then((m) => m.pushSession(saved));
      },

      importBulk: (incoming) =>
        set((state) => {
          const { sessions: sanitized } = sanitizeSavedWorkoutSessions(incoming, '[history-import]');
          const byId = new Map(state.sessions.map((s) => [s.id, s]));
          for (const s of sanitized) byId.set(s.id, s);
          const merged = [...byId.values()].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
          return { sessions: merged.slice(0, MAX_SESSIONS) };
        }),

      replaceAll: (sessions) =>
        set({
          sessions: sanitizeSavedWorkoutSessions(sessions, '[history-replace]').sessions
            .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
            .slice(0, MAX_SESSIONS),
        }),

      updateSessionTimes: (id, startedAt, endedAt) => {
        const startMs = new Date(startedAt).getTime();
        const endMs = new Date(endedAt).getTime();
        if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return;

        set((state) => {
          const next = state.sessions.map((s) =>
            s.id === id ? { ...s, startedAt, endedAt } : s
          );
          const sorted = [...next].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
          const updated = sorted.find((s) => s.id === id);
          if (updated) {
            void import('../lib/sync/workoutSync').then((m) => m.pushSession(updated));
          }
          return { sessions: sorted.slice(0, MAX_SESSIONS) };
        });
      },

      getExerciseHistory: (exerciseKey) => {
        const points: ExerciseSessionPoint[] = [];

        for (const session of get().sessions) {
          const ex = session.exercises.find((e) => e.exerciseKey === exerciseKey);
          if (!ex) continue;
          const stats = summarizeSets(ex.sets, ex.resistanceType);
          if (stats.totalReps === 0) continue;
          points.push({
            sessionId: session.id,
            date: session.endedAt,
            ...stats,
          });
        }

        // 오래된 순 → 차트 왼→오
        return points.sort((a, b) => a.date.localeCompare(b.date));
      },

      getWorkoutDayMap: () => {
        const map: Record<string, WorkoutDayInfo> = {};

        for (const session of get().sessions) {
          // startedAt 우선 — 수동 세션(과거 날짜)도 올바른 날짜에 표시
          const key = isoToLocalDateKey(session.startedAt ?? session.endedAt);
          const muscles = [
            ...new Set(session.exercises.map((ex) => normalizeMuscleGroup(ex.muscleGroup))),
          ] as MuscleGroup[];
          const existing = map[key];
          if (existing) {
            const merged = [...new Set([...existing.muscles, ...muscles])] as MuscleGroup[];
            map[key] = { workedOut: true, muscles: merged };
          } else {
            map[key] = { workedOut: true, muscles };
          }
        }

        return map;
      },
    }),
    {
      name: 'forme-workout-history',
      storage: createJSONStorage(() => AsyncStorage),
      // 저장된 히스토리도 앱 기동 시 정규화 (카탈로그 변경·구버전 데이터 방어)
      onRehydrateStorage: () => (state) => {
        if (!state?.sessions?.length) return;
        const { sessions } = sanitizeSavedWorkoutSessions(
          state.sessions,
          '[history-rehydrate]'
        );
        state.sessions = sessions;
      },
    }
  )
);
