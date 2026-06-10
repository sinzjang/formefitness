// Goal 위저드 · 분석 결과 타입
export type GoalFocusArea = 'upper' | 'lower' | 'core' | 'full';
export type GoalCardio = 'none' | 'sometimes' | 'active';
export type GoalDailyMinutes = '20-30' | '30-45' | '45-60' | '60+';
export type GoalDaysPerWeek = '1-2' | '3-4' | '5+';
export type GoalExperience = 'beginner' | 'returning' | 'intermediate' | 'advanced';

export interface GoalWizardAnswers {
  focusArea: GoalFocusArea;
  cardio: GoalCardio;
  dailyMinutes: GoalDailyMinutes;
  daysPerWeek: GoalDaysPerWeek;
  targetTier: 1 | 2 | 3 | 4 | 5 | 6;
  experience: GoalExperience;
}

export interface GoalAnalysisResult {
  recommendedTier: number;
  userRequestedTier: number;
  tierMatch: boolean;
  timelineMonths: number;
  currentBodyAssessment: string;
  goalFeasibility: string;
  coachMessage: string;
  weeklySchedule: {
    daysPerWeek: number;
    sessionDuration: number;
    splitType: string;
  };
  focusAreas: string[];
  avoidAreas: string[];
  keyExercises: { name: string; reason: string }[];
  nutritionTip: string;
  warningIfTierTooHigh: string | null;
}

export type GoalImageGender = 'male' | 'female';

/** AI 생성 목표 이미지 묶음 */
export interface GoalGeneratedImages {
  /** 본인 사진 기반 단일 이미지 */
  single?: string;
  /** 사진 없이 생성 시 남성 */
  male?: string;
  /** 사진 없이 생성 시 여성 */
  female?: string;
}

export interface GoalCheckin {
  id: string;
  photoUri: string;
  dayIndex: number;
  takenAt: string;
}

export type GoalScreenTab = 'change' | 'compare';

export interface SavedGoal {
  isSetup: boolean;
  wizardAnswers?: GoalWizardAnswers;
  analysisResult?: GoalAnalysisResult;
  currentPhotoUri?: string;
  goalImageUri?: string;
  /** 사진 없이 생성한 남·여 후보 (선택 전 보관) */
  goalImageOptions?: Partial<Record<GoalImageGender, string>>;
  selectedGoalGender?: GoalImageGender;
  checkins?: GoalCheckin[];
  setupAt?: string;
}
