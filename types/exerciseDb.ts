// ExerciseDB (OSS / RapidAPI) 공통 타입
export interface ExerciseDbItem {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

export type ExerciseDbProvider = 'oss' | 'rapidapi';

export interface ExerciseDbSearchResult {
  provider: ExerciseDbProvider;
  data: ExerciseDbItem[];
  error?: string;
  httpStatus?: number;
}

export interface ExerciseDbHealthResult {
  provider: ExerciseDbProvider;
  ok: boolean;
  httpStatus: number;
  message: string;
}

export type RapidApiGifResolution = 180 | 360 | 720 | 1080;
