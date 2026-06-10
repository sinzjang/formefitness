// Zustand persist rehydration 완료 대기
import type { StoreApi, UseBoundStore } from 'zustand';

type PersistStore = UseBoundStore<StoreApi<object>> & {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
};

async function waitForHydration(store: PersistStore): Promise<void> {
  if (store.persist.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsub = store.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

export async function waitForWorkoutStoresHydrated(): Promise<void> {
  const [
    { useLocationStore },
    { useRoutineStore },
    { useHistoryStore },
    { useCustomExerciseStore },
    { useExerciseCatalogPrefsStore },
  ] = await Promise.all([
    import('../../stores/locationStore'),
    import('../../stores/routineStore'),
    import('../../stores/historyStore'),
    import('../../stores/customExerciseStore'),
    import('../../stores/exerciseCatalogPrefsStore'),
  ]);

  await Promise.all([
    waitForHydration(useLocationStore as PersistStore),
    waitForHydration(useRoutineStore as PersistStore),
    waitForHydration(useHistoryStore as PersistStore),
    waitForHydration(useCustomExerciseStore as PersistStore),
    waitForHydration(useExerciseCatalogPrefsStore as PersistStore),
  ]);
}
