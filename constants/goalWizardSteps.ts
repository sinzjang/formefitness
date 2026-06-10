// Goal 위저드 단계 정의
import type { StringKey } from '../lib/i18n';
import type {
  GoalCardio,
  GoalDailyMinutes,
  GoalDaysPerWeek,
  GoalExperience,
  GoalFocusArea,
} from '../types/goal';

export type WizardStepId =
  | 'focusArea'
  | 'cardio'
  | 'dailyMinutes'
  | 'daysPerWeek'
  | 'targetTier'
  | 'experience'
  | 'photo'
  | 'processing'
  | 'result';

export interface WizardOption<T extends string | number = string> {
  value: T;
  labelKey: StringKey;
  descKey?: StringKey;
}

export interface WizardQuestionStep {
  id: Exclude<WizardStepId, 'photo' | 'processing' | 'result'>;
  questionKey: StringKey;
  subtitleKey: StringKey;
  options: WizardOption<string | number>[];
}

export const GOAL_QUESTION_STEPS: WizardQuestionStep[] = [
  {
    id: 'focusArea',
    questionKey: 'goalQ1',
    subtitleKey: 'goalQ1Sub',
    options: [
      { value: 'upper', labelKey: 'goalQ1A', descKey: 'goalQ1ADesc' },
      { value: 'lower', labelKey: 'goalQ1B', descKey: 'goalQ1BDesc' },
      { value: 'core', labelKey: 'goalQ1C', descKey: 'goalQ1CDesc' },
      { value: 'full', labelKey: 'goalQ1D', descKey: 'goalQ1DDesc' },
    ],
  },
  {
    id: 'cardio',
    questionKey: 'goalQ2',
    subtitleKey: 'goalQ2Sub',
    options: [
      { value: 'none', labelKey: 'goalQ2A', descKey: 'goalQ2ADesc' },
      { value: 'sometimes', labelKey: 'goalQ2B', descKey: 'goalQ2BDesc' },
      { value: 'active', labelKey: 'goalQ2C', descKey: 'goalQ2CDesc' },
    ],
  },
  {
    id: 'dailyMinutes',
    questionKey: 'goalQ3',
    subtitleKey: 'goalQ3Sub',
    options: [
      { value: '20-30', labelKey: 'goalQ3A', descKey: 'goalQ3ADesc' },
      { value: '30-45', labelKey: 'goalQ3B', descKey: 'goalQ3BDesc' },
      { value: '45-60', labelKey: 'goalQ3C', descKey: 'goalQ3CDesc' },
      { value: '60+', labelKey: 'goalQ3D', descKey: 'goalQ3DDesc' },
    ],
  },
  {
    id: 'daysPerWeek',
    questionKey: 'goalQ4',
    subtitleKey: 'goalQ4Sub',
    options: [
      { value: '1-2', labelKey: 'goalQ4A', descKey: 'goalQ4ADesc' },
      { value: '3-4', labelKey: 'goalQ4B', descKey: 'goalQ4BDesc' },
      { value: '5+', labelKey: 'goalQ4C', descKey: 'goalQ4CDesc' },
    ],
  },
  {
    id: 'targetTier',
    questionKey: 'goalQ5',
    subtitleKey: 'goalQ5Sub',
    options: ([1, 2, 3, 4, 5, 6] as const).map((n) => ({
      value: n,
      labelKey: `goalTier${n}Name` as StringKey,
      descKey: `goalTier${n}Desc` as StringKey,
    })),
  },
  {
    id: 'experience',
    questionKey: 'goalQ6',
    subtitleKey: 'goalQ6Sub',
    options: [
      { value: 'beginner', labelKey: 'goalQ6A', descKey: 'goalQ6ADesc' },
      { value: 'returning', labelKey: 'goalQ6B', descKey: 'goalQ6BDesc' },
      { value: 'intermediate', labelKey: 'goalQ6C', descKey: 'goalQ6CDesc' },
      { value: 'advanced', labelKey: 'goalQ6D', descKey: 'goalQ6DDesc' },
    ],
  },
];

export const TOTAL_QUESTION_STEPS = GOAL_QUESTION_STEPS.length;

export type PartialAnswers = {
  focusArea?: GoalFocusArea;
  cardio?: GoalCardio;
  dailyMinutes?: GoalDailyMinutes;
  daysPerWeek?: GoalDaysPerWeek;
  targetTier?: 1 | 2 | 3 | 4 | 5 | 6;
  experience?: GoalExperience;
};
