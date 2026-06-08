// workout_data.csv → 앱 스토어 일괄 import (최초 1회)
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoreApi, UseBoundStore } from 'zustand';
import type { WorkoutImportPayload } from '../types/workoutImport';
import { useCustomExerciseStore } from '../stores/customExerciseStore';
import { useHistoryStore } from '../stores/historyStore';
import { useRoutineStore } from '../stores/routineStore';

const IMPORT_KEY = 'forme-workout-csv-import-v1';

let cachedImport: WorkoutImportPayload | null = null;

/** 600KB+ JSON — 필요할 때만 로드 (Metro HMR/module id 오류 방지) */
function getWorkoutImport(): WorkoutImportPayload {
  if (!cachedImport) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedImport = require('../src/data/workout_import.json') as WorkoutImportPayload;
  }
  return cachedImport;
}

type PersistStore = UseBoundStore<StoreApi<object>> & {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
};

/** Zustand persist rehydration 완료 대기 — import 전에 호출해야 덮어쓰기 방지 */
async function waitForHydration(store: PersistStore): Promise<void> {
  if (store.persist.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsub = store.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

async function waitForAllStoresHydrated(): Promise<void> {
  await Promise.all([
    waitForHydration(useCustomExerciseStore as PersistStore),
    waitForHydration(useRoutineStore as PersistStore),
    waitForHydration(useHistoryStore as PersistStore),
  ]);
}

/** CSV 데이터가 아직 import되지 않았으면 스토어에 반영 */
export async function applyWorkoutImportIfNeeded(): Promise<WorkoutImportPayload['stats'] | null> {
  const done = await AsyncStorage.getItem(IMPORT_KEY);
  if (done) return null;

  await waitForAllStoresHydrated();

  const workoutImport = getWorkoutImport();
  useCustomExerciseStore.getState().importBulk(workoutImport.customExercises);
  useRoutineStore.getState().importBulk(workoutImport.routines);
  useHistoryStore.getState().importBulk(workoutImport.sessions);

  await AsyncStorage.setItem(IMPORT_KEY, String(workoutImport.version));
  return workoutImport.stats;
}

/** 개발/재import용 — 플래그 초기화 후 다시 import */
export async function resetAndReimportWorkoutData(): Promise<WorkoutImportPayload['stats']> {
  await AsyncStorage.removeItem(IMPORT_KEY);
  await waitForAllStoresHydrated();

  const workoutImport = getWorkoutImport();
  useCustomExerciseStore.getState().importBulk(workoutImport.customExercises);
  useRoutineStore.getState().importBulk(workoutImport.routines);
  useHistoryStore.getState().importBulk(workoutImport.sessions);

  await AsyncStorage.setItem(IMPORT_KEY, String(workoutImport.version));
  return workoutImport.stats;
}

export function getWorkoutImportStats() {
  return getWorkoutImport().stats;
}
