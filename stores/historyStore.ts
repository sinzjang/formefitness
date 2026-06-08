// 완료된 운동 세션 로컬 저장 (AsyncStorage 영속)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MuscleGroup, SavedWorkoutSession, WorkoutSession } from '../types';
import { getExerciseKey } from '../lib/exerciseKey';
import { summarizeSets } from '../lib/sessionStats';
import { isoToLocalDateKey } from '../lib/dates';

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
  importBulk: (sessions: SavedWorkoutSession[]) => void;
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

        const saved: SavedWorkoutSession = {
          id: session.id,
          endedAt: session.endedAt ?? new Date().toISOString(),
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
      },

      importBulk: (incoming) =>
        set((state) => {
          const byId = new Map(state.sessions.map((s) => [s.id, s]));
          for (const s of incoming) {
            byId.set(s.id, {
              id: s.id,
              endedAt: s.endedAt,
              locationId: s.locationId,
              routineId: s.routineId,
              exercises: s.exercises.map((ex) => ({
                exerciseKey: ex.exerciseKey,
                exerciseName: ex.exerciseName,
                muscleGroup: ex.muscleGroup,
                resistanceType: ex.resistanceType,
                sets: ex.sets,
              })),
            });
          }
          const merged = [...byId.values()].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
          return { sessions: merged.slice(0, MAX_SESSIONS) };
        }),

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
          const key = isoToLocalDateKey(session.endedAt);
          const muscles = [
            ...new Set(session.exercises.map((ex) => ex.muscleGroup)),
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
    }
  )
);
