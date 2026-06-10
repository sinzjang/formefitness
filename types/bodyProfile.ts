import type { GoalFocusArea, GoalWizardAnswers } from './goal';

export interface BodyProfileAnalysis {
  id: string;
  source: 'goal_photo' | 'checkin_photo' | 'manual';
  photoUri?: string;
  capturedAt: string;
  goalTier?: number;
  recommendedTier?: number;
  currentBodyAssessment: string;
  focusAreas: GoalFocusArea[] | string[];
  avoidAreas: string[];
  keyExercises: { name: string; reason: string }[];
  nutritionTip?: string;
  coachNotes: string;
  timelineMonths?: number;
}

export interface SavedBodyProfile {
  latest?: BodyProfileAnalysis;
  history: BodyProfileAnalysis[];
}

export function goalAnswersToBodyFocusAreas(
  answers: Pick<GoalWizardAnswers, 'focusArea'>
): GoalFocusArea[] {
  return [answers.focusArea];
}
