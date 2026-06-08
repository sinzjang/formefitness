// workout_import.json 타입
import type { CustomExercise, MuscleGroup, ResistanceType, SavedWorkoutSession, SetData } from '../types';
import type { RoutineExerciseEntry } from '../types';

export interface WorkoutImportPayload {
  version: number;
  generatedAt: string;
  stats: {
    sessions: number;
    customExercises: number;
    routines: number;
  };
  customExercises: CustomExercise[];
  sessions: Array<
    Omit<SavedWorkoutSession, 'exercises'> & {
      exercises: Array<{
        exerciseKey: string;
        exerciseName: { ko: string; en: string };
        muscleGroup: MuscleGroup;
        resistanceType: ResistanceType;
        isCustom?: boolean;
        customId?: string;
        sets: SetData[];
      }>;
    }
  >;
  routines: Array<{
    id: string;
    locationId: string;
    name: string;
    createdAt: string;
    exercises: RoutineExerciseEntry[];
  }>;
}
