// Forme 앱 전역 타입 정의

export type Language = 'ko' | 'en';

export interface LocalizedText {
  ko: string;
  en: string;
}

export type MuscleGroup = 'chest' | 'shoulder' | 'back' | 'arms' | 'core' | 'legs';

export type ResistanceType = 'weight' | 'band' | 'bodyweight';

export type Gear = 'Body' | 'Barbell' | 'Dumbbell' | 'Kettlebell' | 'Machine' | 'Plate' | 'Band';

export type BandLevel = 'Light' | 'Medium' | 'Heavy' | 'X-Heavy';

export type FatigueLevel = 'none' | 'good' | 'caution' | 'overload';

export type RestSeconds = 30 | 60 | 90 | 120;

/** 운동별 휴식 — 0이면 미설정(00:00) */
export type ExerciseRestSeconds = 0 | RestSeconds;

export const REST_OPTIONS: RestSeconds[] = [30, 60, 90, 120];
export const EXERCISE_REST_OPTIONS: ExerciseRestSeconds[] = [0, 30, 60, 90, 120];
export const DEFAULT_REST_SECONDS: RestSeconds = 60;

export interface SetData {
  setNumber: number;
  weightLb?: number;
  bandLevel?: BandLevel;
  bwAddedLb?: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseName: LocalizedText;
  muscleGroup: MuscleGroup;
  resistanceType: ResistanceType;
  exerciseOrder: number;
  defaultRestSeconds: ExerciseRestSeconds;
  sets: SetData[];
  customId?: string;
}

export interface WorkoutSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  locationId?: string;
  routineId?: string;
  conditionSleep?: number;
  conditionFatigue?: number;
  exercises: WorkoutExercise[];
  aiFeedback?: string;
  runningStartedAt?: string;
}

export interface UserProfile {
  id: string;
  displayName?: string;
  goalTier?: number;
  goalImageUrl?: string;
  weightUnit: 'lb' | 'kg';
}

export interface BodyGoalTier {
  id: number;
  name: string;
  tagline: string;
}

export interface SavedExerciseRecord {
  exerciseKey: string;
  exerciseName: LocalizedText;
  muscleGroup: MuscleGroup;
  resistanceType: ResistanceType;
  sets: SetData[];
}

export interface SavedWorkoutSession {
  id: string;
  endedAt: string;
  locationId?: string;
  routineId?: string;
  exercises: SavedExerciseRecord[];
}

export interface WorkoutLocation {
  id: string;
  name: string;
  isSystem?: boolean;
  color?: string;
}

export interface CustomExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  gear: Gear;
  createdAt: string;
}

export interface RoutineExerciseEntry {
  exerciseKey: string;
  exerciseName: LocalizedText;
  muscleGroup: MuscleGroup;
  resistanceType: ResistanceType;
  defaultRestSeconds: RestSeconds;
  customId?: string;
}

export interface WorkoutRoutine {
  id: string;
  locationId: string;
  name: string;
  exercises: RoutineExerciseEntry[];
  createdAt: string;
}

export type CoachName = 'Kai' | 'Alex' | 'Jordan';

export interface CoachChartData {
  title: string;
  type: string;
}

export interface CoachRoutineWarning {
  exercise: string;
  reason: string;
  suggestion: string;
  alternative?: string;
}

export interface CoachRecommendedRoutine {
  routineName?: string;
  warnings?: CoachRoutineWarning[];
}

export type CoachResponse =
  | {
      type: 'greeting';
      message: string;
      showGoalImage: boolean;
      recommendedRoutine?: CoachRecommendedRoutine;
    }
  | {
      type: 'chart';
      message: string;
      chart: CoachChartData;
    }
  | {
      type: 'text';
      message: string;
    };

export interface CoachMessage {
  id: string;
  role: 'user' | 'coach';
  text: string;
  createdAt: string;
  showGoalImage?: boolean;
  recommendedRoutine?: CoachRecommendedRoutine;
  chart?: CoachChartData;
}
