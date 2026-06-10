import type { BodyProfileAnalysis } from '../types/bodyProfile';
import type { GoalAnalysisResult, GoalWizardAnswers } from '../types/goal';
import { goalAnswersToBodyFocusAreas } from '../types/bodyProfile';

export function buildBodyProfileFromGoalAnalysis(
  answers: GoalWizardAnswers,
  analysis: GoalAnalysisResult,
  photoUri?: string
): BodyProfileAnalysis {
  const capturedAt = new Date().toISOString();

  return {
    id: `body_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    source: 'goal_photo',
    photoUri,
    capturedAt,
    goalTier: answers.targetTier,
    recommendedTier: analysis.recommendedTier,
    currentBodyAssessment: analysis.currentBodyAssessment,
    focusAreas: analysis.focusAreas.length > 0
      ? analysis.focusAreas
      : goalAnswersToBodyFocusAreas(answers),
    avoidAreas: analysis.avoidAreas,
    keyExercises: analysis.keyExercises,
    nutritionTip: analysis.nutritionTip,
    coachNotes: [
      analysis.currentBodyAssessment,
      analysis.goalFeasibility,
      analysis.warningIfTierTooHigh,
    ]
      .filter(Boolean)
      .join('\n'),
    timelineMonths: analysis.timelineMonths,
  };
}
