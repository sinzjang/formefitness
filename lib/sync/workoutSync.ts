// 운동 데이터 ↔ Supabase 동기화
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '../supabase';
import { waitForWorkoutStoresHydrated } from './hydration';
import { clearLocalWorkoutData, SYNC_USER_KEY } from './clearLocalWorkout';
import {
  appCatalogPrefToDb,
  appCustomExerciseToDb,
  appLocationToDb,
  appRoutineToDb,
  appSessionToDb,
  dbCatalogPrefsToApp,
  dbCustomExerciseToApp,
  dbLocationToApp,
  dbRoutineToApp,
  dbSessionToApp,
  type DbCatalogPrefRow,
  type DbCustomExerciseRow,
  type DbLocationRow,
  type DbRoutineRow,
  type DbSessionRow,
} from './mappers';
import type {
  CustomExercise,
  SavedWorkoutSession,
  WorkoutLocation,
  WorkoutRoutine,
} from '../../types';

const SESSION_BATCH = 20;

let syncInFlight: Promise<void> | null = null;

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

function runInBackground(task: () => Promise<void>): void {
  if (!isSupabaseConfigured) return;
  void task().catch((e) => {
    console.warn('[sync]', e instanceof Error ? e.message : e);
  });
}

async function upsertLocationMap(userId: string): Promise<Map<string, string>> {
  const { useLocationStore } = await import('../../stores/locationStore');
  const locations = useLocationStore.getState().locations;
  if (locations.length === 0) return new Map();

  const rows = locations.map((loc) => appLocationToDb(userId, loc));
  const { data, error } = await supabase
    .from('workout_locations')
    .upsert(rows, { onConflict: 'user_id,client_id' })
    .select('id, client_id');

  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of (data ?? []) as DbLocationRow[]) {
    map.set(row.client_id, row.id);
  }
  return map;
}

async function fetchLocationMaps(userId: string): Promise<{
  clientToDb: Map<string, string>;
  dbToClient: Map<string, string>;
}> {
  const { data, error } = await supabase
    .from('workout_locations')
    .select('id, client_id')
    .eq('user_id', userId);

  if (error) throw error;

  const clientToDb = new Map<string, string>();
  const dbToClient = new Map<string, string>();
  for (const row of data ?? []) {
    clientToDb.set(row.client_id, row.id);
    dbToClient.set(row.id, row.client_id);
  }
  return { clientToDb, dbToClient };
}

async function fetchRoutineMap(userId: string): Promise<{
  clientToDb: Map<string, string>;
  dbToClient: Map<string, string>;
}> {
  const { data, error } = await supabase
    .from('workout_routines')
    .select('id, client_id')
    .eq('user_id', userId);

  if (error) throw error;

  const clientToDb = new Map<string, string>();
  const dbToClient = new Map<string, string>();
  for (const row of data ?? []) {
    clientToDb.set(row.client_id, row.id);
    dbToClient.set(row.id, row.client_id);
  }
  return { clientToDb, dbToClient };
}

async function hasLocalWorkoutData(): Promise<boolean> {
  const [
    { useRoutineStore },
    { useHistoryStore },
    { useCustomExerciseStore },
  ] = await Promise.all([
    import('../../stores/routineStore'),
    import('../../stores/historyStore'),
    import('../../stores/customExerciseStore'),
  ]);
  return (
    useRoutineStore.getState().routines.length > 0 ||
    useHistoryStore.getState().sessions.length > 0 ||
    useCustomExerciseStore.getState().exercises.length > 0
  );
}

async function getCloudRowCount(userId: string): Promise<number> {
  const tables = [
    'workout_locations',
    'workout_routines',
    'workout_sessions',
    'custom_exercises',
    'exercise_catalog_prefs',
  ] as const;

  let total = 0;
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) throw error;
    total += count ?? 0;
  }
  return total;
}

/** 클라우드 → 로컬 스토어 전체 교체 */
export async function pullWorkoutData(userId: string): Promise<void> {
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

  const [locRes, routineRes, sessionRes, customRes, prefRes] = await Promise.all([
    supabase.from('workout_locations').select('*').eq('user_id', userId),
    supabase.from('workout_routines').select('*').eq('user_id', userId),
    supabase
      .from('workout_sessions')
      .select('client_id, ended_at, location_id, routine_id, exercises')
      .eq('user_id', userId)
      .order('ended_at', { ascending: false })
      .limit(200),
    supabase.from('custom_exercises').select('*').eq('user_id', userId),
    supabase.from('exercise_catalog_prefs').select('*').eq('user_id', userId),
  ]);

  for (const res of [locRes, routineRes, sessionRes, customRes, prefRes]) {
    if (res.error) throw res.error;
  }

  const dbToClientLoc = new Map<string, string>();
  for (const row of (locRes.data ?? []) as DbLocationRow[]) {
    dbToClientLoc.set(row.id, row.client_id);
  }

  const dbToClientRoutine = new Map<string, string>();
  for (const row of (routineRes.data ?? []) as DbRoutineRow[]) {
    dbToClientRoutine.set(row.id, row.client_id);
  }

  const locations = ((locRes.data ?? []) as DbLocationRow[]).map(dbLocationToApp);
  const routines = ((routineRes.data ?? []) as DbRoutineRow[]).map((row) =>
    dbRoutineToApp(row, dbToClientLoc)
  );
  const sessions = ((sessionRes.data ?? []) as DbSessionRow[]).map((row) =>
    dbSessionToApp(row, dbToClientLoc, dbToClientRoutine)
  );
  const customExercises = ((customRes.data ?? []) as DbCustomExerciseRow[]).map(
    dbCustomExerciseToApp
  );
  const prefs = dbCatalogPrefsToApp((prefRes.data ?? []) as DbCatalogPrefRow[]);

  const prevSelected = useLocationStore.getState().selectedLocationId;
  useLocationStore.getState().replaceAll(locations, prevSelected);
  useRoutineStore.getState().replaceAll(routines);
  useHistoryStore.getState().replaceAll(sessions);
  useCustomExerciseStore.getState().replaceAll(customExercises);
  useExerciseCatalogPrefsStore.getState().replaceAll(prefs);

  await AsyncStorage.setItem(SYNC_USER_KEY, userId);
}

/** 로컬 → 클라우드 전체 업로드 (최초 마이그레이션) */
export async function pushWorkoutData(userId: string): Promise<void> {
  const [
    { useRoutineStore },
    { useHistoryStore },
    { useCustomExerciseStore },
    { useExerciseCatalogPrefsStore },
  ] = await Promise.all([
    import('../../stores/routineStore'),
    import('../../stores/historyStore'),
    import('../../stores/customExerciseStore'),
    import('../../stores/exerciseCatalogPrefsStore'),
  ]);

  const clientLocationIdToDbId = await upsertLocationMap(userId);

  const customExercises = useCustomExerciseStore.getState().exercises;
  if (customExercises.length > 0) {
    const rows = customExercises.map((ex) => appCustomExerciseToDb(userId, ex));
    const { error } = await supabase
      .from('custom_exercises')
      .upsert(rows, { onConflict: 'user_id,client_id' });
    if (error) throw error;
  }

  const prefs = useExerciseCatalogPrefsStore.getState().prefs;
  const prefRows = Object.entries(prefs).map(([key, pref]) =>
    appCatalogPrefToDb(userId, key, pref)
  );
  if (prefRows.length > 0) {
    const { error } = await supabase
      .from('exercise_catalog_prefs')
      .upsert(prefRows, { onConflict: 'user_id,exercise_key' });
    if (error) throw error;
  }

  const routines = useRoutineStore.getState().routines;
  if (routines.length > 0) {
    const rows = routines.map((r) =>
      appRoutineToDb(userId, r, clientLocationIdToDbId)
    );
    const { error } = await supabase
      .from('workout_routines')
      .upsert(rows, { onConflict: 'user_id,client_id' });
    if (error) throw error;
  }

  const { clientToDb: clientRoutineIdToDbId } = await fetchRoutineMap(userId);

  const sessions = useHistoryStore.getState().sessions;
  for (let i = 0; i < sessions.length; i += SESSION_BATCH) {
    const chunk = sessions.slice(i, i + SESSION_BATCH);
    const rows = chunk.map((s) =>
      appSessionToDb(userId, s, clientLocationIdToDbId, clientRoutineIdToDbId)
    );
    const { error } = await supabase
      .from('workout_sessions')
      .upsert(rows, { onConflict: 'user_id,client_id' });
    if (error) throw error;
  }

  await AsyncStorage.setItem(SYNC_USER_KEY, userId);
}

/** 로그인·앱 시작 시 동기화 — 클라우드 우선, 빈 클라우드면 로컬 업로드 */
export async function syncWorkoutOnLogin(userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  syncInFlight = (async () => {
    await waitForWorkoutStoresHydrated();

    const lastUserId = await AsyncStorage.getItem(SYNC_USER_KEY);
    if (lastUserId && lastUserId !== userId) {
      await clearLocalWorkoutData();
    }

    const cloudCount = await getCloudRowCount(userId);
    if (cloudCount === 0 && (await hasLocalWorkoutData())) {
      await pushWorkoutData(userId);
    } else if (cloudCount > 0) {
      await pullWorkoutData(userId);
    } else {
      await AsyncStorage.setItem(SYNC_USER_KEY, userId);
    }
  })();

  try {
    await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

// ─── 개별 변경 즉시 push (로그인 상태에서만) ─────────────────

export function pushLocation(location: WorkoutLocation): void {
  runInBackground(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase
      .from('workout_locations')
      .upsert(appLocationToDb(userId, location), { onConflict: 'user_id,client_id' });
    if (error) throw error;
  });
}

export function pushRoutine(routine: WorkoutRoutine): void {
  runInBackground(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { clientToDb } = await fetchLocationMaps(userId);
    const { error } = await supabase
      .from('workout_routines')
      .upsert(appRoutineToDb(userId, routine, clientToDb), {
        onConflict: 'user_id,client_id',
      });
    if (error) throw error;
  });
}

export function deleteRoutineFromCloud(clientId: string): void {
  runInBackground(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase
      .from('workout_routines')
      .delete()
      .eq('user_id', userId)
      .eq('client_id', clientId);
    if (error) throw error;
  });
}

export function pushSession(session: SavedWorkoutSession): void {
  runInBackground(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { clientToDb: locMap } = await fetchLocationMaps(userId);
    const { clientToDb: routineMap } = await fetchRoutineMap(userId);
    const { error } = await supabase
      .from('workout_sessions')
      .upsert(appSessionToDb(userId, session, locMap, routineMap), {
        onConflict: 'user_id,client_id',
      });
    if (error) throw error;
  });
}

export function pushCustomExercise(exercise: CustomExercise): void {
  runInBackground(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase
      .from('custom_exercises')
      .upsert(appCustomExerciseToDb(userId, exercise), {
        onConflict: 'user_id,client_id',
      });
    if (error) throw error;
  });
}

export function deleteCustomExerciseFromCloud(clientId: string): void {
  runInBackground(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase
      .from('custom_exercises')
      .delete()
      .eq('user_id', userId)
      .eq('client_id', clientId);
    if (error) throw error;
  });
}

export function pushCatalogPref(exerciseKey: string, pref: { is_active?: boolean; is_favorite?: boolean }): void {
  runInBackground(async () => {
    const userId = await getUserId();
    if (!userId) return;
    const { error } = await supabase
      .from('exercise_catalog_prefs')
      .upsert(appCatalogPrefToDb(userId, exerciseKey, pref), {
        onConflict: 'user_id,exercise_key',
      });
    if (error) throw error;
  });
}
