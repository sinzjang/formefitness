// Goal 설정 위저드 — 6단계 질문 → 사진 → AI 분석 · 이미지 생성
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import type { Language } from '../../types';
import type {
  GoalAnalysisResult,
  GoalGeneratedImages,
  GoalImageGender,
  GoalWizardAnswers,
} from '../../types/goal';
import {
  GOAL_QUESTION_STEPS,
  TOTAL_QUESTION_STEPS,
  type PartialAnswers,
  type WizardStepId,
} from '../../constants/goalWizardSteps';
import { colors, layout, typography } from '../../constants/theme';
import { getTierName } from '../../constants/tiers';
import { analyzeGoalWithOpenAi, generateGoalImagesWithOpenAi } from '../../lib/goalOpenAi';
import { buildBodyProfileFromGoalAnalysis } from '../../lib/bodyProfile';
import { t } from '../../lib/i18n';
import { pickImageFromCamera, pickImageFromLibrary } from '../../lib/pickImage';
import { useBodyProfileStore } from '../../stores/bodyProfileStore';
import { useGoalStore } from '../../stores/goalStore';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ModalSafeArea } from '../ui/ModalSafeArea';

interface GoalWizardModalProps {
  visible: boolean;
  lang: Language;
  onClose: () => void;
}

type Phase = WizardStepId;

function isAnswersComplete(a: PartialAnswers): a is GoalWizardAnswers {
  return (
    a.focusArea != null &&
    a.cardio != null &&
    a.dailyMinutes != null &&
    a.daysPerWeek != null &&
    a.targetTier != null &&
    a.experience != null
  );
}

export function GoalWizardModal({ visible, lang, onClose }: GoalWizardModalProps) {
  const saveGoal = useGoalStore((s) => s.saveGoal);
  const saveBodyAnalysis = useBodyProfileStore((s) => s.saveAnalysis);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('focusArea');
  const [answers, setAnswers] = useState<PartialAnswers>({});
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [analysis, setAnalysis] = useState<GoalAnalysisResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GoalGeneratedImages>({});
  const [selectedGender, setSelectedGender] = useState<GoalImageGender>('male');
  const [processing, setProcessing] = useState(false);
  const [processingDual, setProcessingDual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageWarning, setImageWarning] = useState<string | null>(null);

  const resetWizard = useCallback(() => {
    setQuestionIndex(0);
    setPhase('focusArea');
    setAnswers({});
    setPhotoUri(undefined);
    setAnalysis(null);
    setGeneratedImages({});
    setSelectedGender('male');
    setProcessing(false);
    setProcessingDual(false);
    setError(null);
    setImageWarning(null);
  }, []);

  useEffect(() => {
    if (visible) resetWizard();
  }, [visible, resetWizard]);

  const currentQuestion = GOAL_QUESTION_STEPS[questionIndex];
  const selectedValue = currentQuestion ? answers[currentQuestion.id] : undefined;

  const progressLabel = useMemo(() => {
    if (phase === 'photo') return `${TOTAL_QUESTION_STEPS}/${TOTAL_QUESTION_STEPS}`;
    if (questionIndex < TOTAL_QUESTION_STEPS) {
      return `${questionIndex + 1}/${TOTAL_QUESTION_STEPS}`;
    }
    return '';
  }, [phase, questionIndex]);

  const selectOption = (value: string | number) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const goNextQuestion = () => {
    if (questionIndex < TOTAL_QUESTION_STEPS - 1) {
      const next = questionIndex + 1;
      setQuestionIndex(next);
      setPhase(GOAL_QUESTION_STEPS[next].id);
    } else {
      setPhase('photo');
    }
  };

  const goBack = () => {
    if (phase === 'photo') {
      setQuestionIndex(TOTAL_QUESTION_STEPS - 1);
      setPhase('experience');
      return;
    }
    if (phase === 'result' || phase === 'processing') return;
    if (questionIndex > 0) {
      const prev = questionIndex - 1;
      setQuestionIndex(prev);
      setPhase(GOAL_QUESTION_STEPS[prev].id);
    }
  };

  const runAnalysis = async (uri?: string) => {
    if (!isAnswersComplete(answers)) return;

    const hasUserPhoto = !!uri;
    setPhase('processing');
    setProcessing(true);
    setProcessingDual(!hasUserPhoto);
    setError(null);
    setImageWarning(null);

    try {
      const result = await analyzeGoalWithOpenAi(answers, uri);
      setAnalysis(result);

      const images = await generateGoalImagesWithOpenAi(answers, result, { hasUserPhoto });
      setGeneratedImages(images);

      if (hasUserPhoto) {
        if (!images.single) setImageWarning(t('goalWizardImageError', lang));
      } else {
        if (!images.male && !images.female) {
          setImageWarning(t('goalWizardImageError', lang));
        } else {
          setSelectedGender(images.male ? 'male' : 'female');
        }
      }
      setPhase('result');
    } catch (e) {
      console.warn('[GoalWizard:analysis]', e);
      setError(t('goalWizardError', lang));
      setPhase('photo');
    } finally {
      setProcessing(false);
      setProcessingDual(false);
    }
  };

  const handlePhotoChoice = async (source: 'camera' | 'gallery' | 'skip') => {
    if (source === 'skip') {
      setPhotoUri(undefined);
      await runAnalysis(undefined);
      return;
    }

    const picked =
      source === 'camera' ? await pickImageFromCamera() : await pickImageFromLibrary();
    if (!picked?.uri) return;

    setPhotoUri(picked.uri);
    await runAnalysis(picked.uri);
  };

  const selectedGoalImageUri = useMemo(() => {
    if (photoUri) return generatedImages.single;
    return selectedGender === 'male' ? generatedImages.male : generatedImages.female;
  }, [photoUri, generatedImages, selectedGender]);

  const handleFinish = () => {
    if (!isAnswersComplete(answers) || !analysis) return;
    const dualMode = !photoUri && (generatedImages.male || generatedImages.female);

    if (photoUri) {
      saveBodyAnalysis(buildBodyProfileFromGoalAnalysis(answers, analysis, photoUri));
    }

    saveGoal({
      answers,
      analysis,
      currentPhotoUri: photoUri,
      goalImageUri: selectedGoalImageUri,
      goalImageOptions: dualMode
        ? { male: generatedImages.male, female: generatedImages.female }
        : undefined,
      selectedGoalGender: dualMode ? selectedGender : undefined,
    });
    onClose();
  };

  const canGoNext = selectedValue != null;

  const renderHeader = () => (
    <View style={styles.header}>
      <Pressable
        onPress={phase === 'result' ? onClose : questionIndex === 0 && phase !== 'photo' ? onClose : goBack}
        hitSlop={8}
        disabled={phase === 'processing'}
      >
        <Icon
          name={phase === 'result' || (questionIndex === 0 && phase !== 'photo') ? 'close' : 'chevron-back'}
          size={24}
          color={colors.textPrimary}
        />
      </Pressable>
      <Text style={styles.headerTitle}>{t('goalWizardTitle', lang)}</Text>
      <Text style={styles.progress}>{progressLabel}</Text>
    </View>
  );

  const renderQuestion = () => {
    if (!currentQuestion) return null;
    return (
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.question}>{t(currentQuestion.questionKey, lang)}</Text>
        <Text style={styles.subtitle}>{t(currentQuestion.subtitleKey, lang)}</Text>

        <View style={styles.options}>
          {currentQuestion.options.map((opt) => {
            const active = selectedValue === opt.value;
            return (
              <Pressable
                key={String(opt.value)}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => selectOption(opt.value)}
              >
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                  {t(opt.labelKey, lang)}
                </Text>
                {opt.descKey ? (
                  <Text style={[styles.optionDesc, active && styles.optionDescActive]}>
                    {t(opt.descKey, lang)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderPhoto = () => (
    <View style={styles.photoWrap}>
      <Text style={styles.question}>{t('goalWizardPhotoTitle', lang)}</Text>
      <Text style={styles.subtitle}>{t('goalWizardPhotoSub', lang)}</Text>

      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {processing ? (
        <View style={styles.processingInline}>
          <ActivityIndicator color={colors.textPrimary} />
          <Text style={styles.processingText}>{t('goalWizardProcessing', lang)}</Text>
          <Text style={styles.subtitle}>
            {processingDual ? t('goalWizardProcessingDualSub', lang) : t('goalWizardProcessingSub', lang)}
          </Text>
        </View>
      ) : (
        <View style={styles.photoActions}>
          <Button title={t('goalWizardTakePhoto', lang)} onPress={() => handlePhotoChoice('camera')} />
          <Button
            title={t('goalWizardPickGallery', lang)}
            variant="secondary"
            onPress={() => handlePhotoChoice('gallery')}
          />
          <Pressable onPress={() => handlePhotoChoice('skip')} style={styles.skipBtn}>
            <Text style={styles.skipText}>{t('goalWizardSkipPhoto', lang)}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.centerBlock}>
      <ActivityIndicator size="large" color={colors.textPrimary} />
      <Text style={styles.processingText}>{t('goalWizardProcessing', lang)}</Text>
      <Text style={styles.subtitle}>
        {processingDual ? t('goalWizardProcessingDualSub', lang) : t('goalWizardProcessingSub', lang)}
      </Text>
    </View>
  );

  const renderDualImageOption = (gender: GoalImageGender, uri?: string) => {
    const active = selectedGender === gender;
    const label = gender === 'male' ? t('goalWizardMale', lang) : t('goalWizardFemale', lang);
    return (
      <Pressable
        key={gender}
        style={[styles.dualOption, active && styles.dualOptionActive]}
        onPress={() => uri && setSelectedGender(gender)}
        disabled={!uri}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.dualImage} contentFit="cover" />
        ) : (
          <View style={styles.dualPlaceholder}>
            <Icon name="image" size={24} color={colors.textMuted} />
          </View>
        )}
        <Text style={[styles.dualLabel, active && styles.dualLabelActive]}>{label}</Text>
      </Pressable>
    );
  };

  const renderResult = () => {
    if (!analysis || !isAnswersComplete(answers)) return null;
    return (
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.question}>{t('goalWizardResultTitle', lang)}</Text>
        <Text style={styles.resultTier}>
          {getTierName(answers.targetTier, lang)}
        </Text>

        {!photoUri && (generatedImages.male || generatedImages.female) ? (
          <>
            <Text style={styles.pickHint}>{t('goalWizardPickGoalImage', lang)}</Text>
            <View style={styles.dualRow}>
              {renderDualImageOption('male', generatedImages.male)}
              {renderDualImageOption('female', generatedImages.female)}
            </View>
          </>
        ) : selectedGoalImageUri ? (
          <Image source={{ uri: selectedGoalImageUri }} style={styles.goalImage} contentFit="cover" />
        ) : (
          <View style={styles.goalImagePlaceholder}>
            <Icon name="image" size={32} color={colors.textMuted} />
          </View>
        )}

        {imageWarning ? <Text style={styles.warning}>{imageWarning}</Text> : null}

        <Text style={styles.coachMessage}>{analysis.coachMessage}</Text>
        {analysis.goalFeasibility ? (
          <Text style={styles.feasibility}>{analysis.goalFeasibility}</Text>
        ) : null}
        {analysis.warningIfTierTooHigh ? (
          <Text style={styles.warning}>{analysis.warningIfTierTooHigh}</Text>
        ) : null}

        <Button title={t('goalWizardDone', lang)} onPress={handleFinish} style={styles.doneBtn} />
      </ScrollView>
    );
  };

  const showQuestionFooter = phase !== 'photo' && phase !== 'processing' && phase !== 'result';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea>
        {renderHeader()}

        <View style={styles.body}>
          {showQuestionFooter && renderQuestion()}
          {phase === 'photo' && renderPhoto()}
          {phase === 'processing' && renderProcessing()}
          {phase === 'result' && renderResult()}
        </View>

        {showQuestionFooter ? (
          <View style={styles.footer}>
            <Button
              title={t('goalWizardNext', lang)}
              onPress={goNextQuestion}
              disabled={!canGoNext}
            />
          </View>
        ) : null}
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: layout.borderWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.sectionHeader,
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
  },
  progress: {
    ...typography.caption,
    color: colors.textSecondary,
    minWidth: 36,
    textAlign: 'right',
  },
  body: {
    flex: 1,
  },
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: 24,
    gap: 8,
  },
  question: {
    ...typography.sectionHeader,
    fontSize: 22,
    lineHeight: 30,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
  },
  options: {
    gap: 10,
  },
  option: {
    padding: 16,
    borderRadius: layout.cardRadius,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  optionLabel: {
    ...typography.listItem,
  },
  optionLabelActive: {
    fontWeight: '600',
  },
  optionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  optionDescActive: {
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 12,
    paddingTop: 8,
    borderTopWidth: layout.borderWidth,
    borderTopColor: colors.border,
  },
  photoWrap: {
    flex: 1,
    padding: layout.screenPadding,
    gap: 8,
  },
  photoPreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.surface,
    marginVertical: 12,
  },
  photoActions: {
    marginTop: 'auto',
    gap: 10,
    paddingBottom: 8,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  processingInline: {
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
  },
  centerBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: layout.screenPadding,
    gap: 12,
  },
  processingText: {
    ...typography.listItem,
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    ...typography.caption,
    color: colors.accent,
    marginTop: 8,
  },
  resultTier: {
    ...typography.listItem,
    color: colors.accent,
    marginBottom: 12,
  },
  goalImage: {
    width: '100%',
    aspectRatio: 1024 / 1536,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.surface,
    marginBottom: 16,
  },
  goalImagePlaceholder: {
    width: '100%',
    aspectRatio: 1024 / 1536,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  pickHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  dualRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dualOption: {
    flex: 1,
    borderRadius: layout.cardRadius,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dualOptionActive: {
    borderColor: colors.textPrimary,
  },
  dualImage: {
    width: '100%',
    aspectRatio: 1024 / 1536,
    backgroundColor: colors.surface,
  },
  dualPlaceholder: {
    width: '100%',
    aspectRatio: 1024 / 1536,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualLabel: {
    ...typography.caption,
    textAlign: 'center',
    paddingVertical: 8,
    color: colors.textSecondary,
  },
  dualLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  coachMessage: {
    ...typography.body,
    lineHeight: 24,
    marginBottom: 8,
  },
  feasibility: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  warning: {
    ...typography.caption,
    color: colors.accent,
    lineHeight: 20,
    marginBottom: 8,
  },
  doneBtn: {
    marginTop: 16,
  },
});
