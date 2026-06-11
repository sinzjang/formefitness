// Supabase workout_* ↔ 앱 타입 변환
import type {
  CustomExercise,
  SavedWorkoutSession,
  WorkoutLocation,
  WorkoutRoutine,
} from '../../types';
import type { CatalogExercisePref } from '../../stores/exerciseCatalogPrefsStore';
import { sanitizeSavedWorkoutSessions } from '../workoutHistoryIntegrity';

export interface DbLocationRow {
  id: string;
  client_id: string;
  name: string;
  is_system: boolean | null;
  color: string | null;
}

export interface DbRoutineRow {
  id: string;
  client_id: string;
  location_id: string | null;
  name: string;
  exercises: WorkoutRoutine['exercises'];
  is_active: boolean | null;
  created_at: string;
}

export interface DbSessionRow {
  client_id: string;
  started_at?: string | null;
  ended_at: string;
  location_id: string | null;
  routine_id: string | null;
  exercises: SavedWorkoutSession['exercises'];
}

export interface DbCustomExerciseRow {
  client_id: string;
  name: string;
  muscle_group: string;
  gear: string;
  measurement_type?: string | null;
  media_uri?: string | null;
  media_type?: string | null;
  is_active: boolean | null;
  is_favorite: boolean | null;
  created_at: string;
}

export interface DbCatalogPrefRow {
  exercise_key: string;
  is_active: boolean | null;
  is_favorite: boolean | null;
}

export function dbLocationToApp(row: DbLocationRow): WorkoutLocation {
  return {
    id: row.client_id,
    name: row.name,
    isSystem: row.is_system ?? false,
    color: row.color ?? undefined,
  };
}

export function appLocationToDb(
  userId: string,
  location: WorkoutLocation
): Record<string, unknown> {
  return {
    user_id: userId,
    client_id: location.id,
    name: location.name,
    is_system: location.isSystem ?? false,
    color: location.color ?? null,
  };
}

export function dbRoutineToApp(
  row: DbRoutineRow,
  dbLocationIdToClientId: Map<string, string>
): WorkoutRoutine {
  return {
    id: row.client_id,
    locationId: row.location_id
      ? (dbLocationIdToClientId.get(row.location_id) ?? 'loc_gym')
      : 'loc_gym',
    name: row.name,
    exercises: row.exercises ?? [],
    createdAt: row.created_at,
    is_active: row.is_active ?? true,
  };
}

export function appRoutineToDb(
  userId: string,
  routine: WorkoutRoutine,
  clientLocationIdToDbId: Map<string, string>
): Record<string, unknown> {
  return {
    user_id: userId,
    client_id: routine.id,
    name: routine.name,
    exercises: routine.exercises,
    is_active: routine.is_active ?? true,
    location_id: clientLocationIdToDbId.get(routine.locationId) ?? null,
    updated_at: new Date().toISOString(),
  };
}

export function dbSessionToApp(
  row: DbSessionRow,
  dbLocationIdToClientId: Map<string, string>,
  dbRoutineIdToClientId: Map<string, string>
): SavedWorkoutSession {
  const draft = {
    id: row.client_id,
    startedAt: row.started_at ?? undefined,
    endedAt: row.ended_at,
    locationId: row.location_id
      ? dbLocationIdToClientId.get(row.location_id)
      : undefined,
    routineId: row.routine_id
      ? dbRoutineIdToClientId.get(row.routine_id)
      : undefined,
    exercises: row.exercises ?? [],
  };
  const { sessions } = sanitizeSavedWorkoutSessions([draft], '[sync-pull]');
  const sanitized = sessions[0];
  return {
    ...draft,
    startedAt: sanitized?.startedAt ?? draft.startedAt,
    endedAt: sanitized?.endedAt ?? draft.endedAt,
    exercises: sanitized?.exercises ?? [],
  };
}

export function appSessionToDb(
  userId: string,
  session: SavedWorkoutSession,
  clientLocationIdToDbId: Map<string, string>,
  clientRoutineIdToDbId: Map<string, string>
): Record<string, unknown> {
  return {
    user_id: userId,
    client_id: session.id,
    started_at: session.startedAt ?? session.endedAt,
    ended_at: session.endedAt,
    exercises: session.exercises,
    location_id: session.locationId
      ? (clientLocationIdToDbId.get(session.locationId) ?? null)
      : null,
    routine_id: session.routineId
      ? (clientRoutineIdToDbId.get(session.routineId) ?? null)
      : null,
  };
}

export function dbCustomExerciseToApp(row: DbCustomExerciseRow): CustomExercise {
  return {
    id: row.client_id,
    name: row.name,
    muscleGroup: row.muscle_group as CustomExercise['muscleGroup'],
    gear: row.gear as CustomExercise['gear'],
    measurementType: row.measurement_type as CustomExercise['measurementType'],
    mediaUri: row.media_uri ?? undefined,
    mediaType: row.media_type as CustomExercise['mediaType'],
    createdAt: row.created_at,
    is_active: row.is_active ?? true,
    is_favorite: row.is_favorite ?? false,
  };
}

export function appCustomExerciseToDb(
  userId: string,
  exercise: CustomExercise
): Record<string, unknown> {
  return {
    user_id: userId,
    client_id: exercise.id,
    name: exercise.name,
    muscle_group: exercise.muscleGroup,
    gear: exercise.gear,
    measurement_type: exercise.measurementType ?? 'weight',
    media_uri: exercise.mediaUri ?? null,
    media_type: exercise.mediaType ?? null,
    is_active: exercise.is_active ?? true,
    is_favorite: exercise.is_favorite ?? false,
    created_at: exercise.createdAt,
  };
}

export function dbCatalogPrefsToApp(
  rows: DbCatalogPrefRow[]
): Record<string, CatalogExercisePref> {
  const prefs: Record<string, CatalogExercisePref> = {};
  for (const row of rows) {
    prefs[row.exercise_key] = {
      is_active: row.is_active ?? undefined,
      is_favorite: row.is_favorite ?? undefined,
    };
  }
  return prefs;
}

export function appCatalogPrefToDb(
  userId: string,
  exerciseKey: string,
  pref: CatalogExercisePref
): Record<string, unknown> {
  return {
    user_id: userId,
    exercise_key: exerciseKey,
    is_active: pref.is_active ?? null,
    is_favorite: pref.is_favorite ?? null,
  };
}
