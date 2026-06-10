// Goal 스크린 — 목표 비교 탭
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import type { Language } from '../../types';
import type { GoalAnalysisResult, GoalCheckin, GoalWizardAnswers } from '../../types/goal';
import type { SavedWorkoutSession } from '../../types';
import { colors, layout, typography } from '../../constants/theme';
import { formatGoalDate } from '../../lib/goalProgress';
import { getTierName } from '../../constants/tiers';
import { analyzeGoalComparison } from '../../lib/goalScreenAnalysis';
import { t } from '../../lib/i18n';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

interface GoalComparePanelProps {
  lang: Language;
  checkins: GoalCheckin[];
  answers: GoalWizardAnswers;
  analysis: GoalAnalysisResult;
  goalImageUri?: string;
  sessions: SavedWorkoutSession[];
}

export function GoalComparePanel({
  lang,
  checkins,
  answers,
  analysis,
  goalImageUri,
  sessions,
}: GoalComparePanelProps) {
  const currentPhoto = useMemo(() => {
    const sorted = [...checkins].sort(
      (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
    );
    return sorted[sorted.length - 1];
  }, [checkins]);

  const [aiResult, setAiResult] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const tierName = getTierName(answers.targetTier, lang);
  const canAnalyze = !!(currentPhoto && goalImageUri);

  const handleAnalyze = async () => {
    if (!currentPhoto || !goalImageUri) return;
    setAnalyzing(true);
    setAiError(null);
    try {
      const text = await analyzeGoalComparison(
        currentPhoto,
        goalImageUri,
        answers,
        analysis,
        sessions,
        lang
      );
      setAiResult(text);
    } catch (e) {
      console.warn('[GoalComparePanel]', e);
      setAiError(t('goalScreenAiError', lang));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>{t('goalScreenMyCurrent', lang)}</Text>
          <View style={styles.photoBox}>
            {currentPhoto ? (
              <>
                <Image source={{ uri: currentPhoto.photoUri }} style={styles.photo} contentFit="cover" />
                <View style={styles.meta}>
                  <Text style={styles.day}>D+{currentPhoto.dayIndex}</Text>
                  <Text style={styles.date}>{formatGoalDate(currentPhoto.takenAt)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.empty}>
                <Icon name="add" size={28} color={colors.textMuted} />
                <Text style={styles.emptyHint}>{t('goalScreenAddPhotoHint', lang)}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.col}>
          <Text style={styles.label}>{t('goalScreenGoalImage', lang)}</Text>
          <View style={styles.photoBox}>
            {goalImageUri ? (
              <>
                <Image source={{ uri: goalImageUri }} style={styles.photo} contentFit="cover" />
                <View style={styles.meta}>
                  <Text style={styles.day}>Tier {answers.targetTier}</Text>
                  <Text style={styles.date}>{tierName}</Text>
                </View>
              </>
            ) : (
              <View style={styles.empty}>
                <Icon name="image" size={28} color={colors.textMuted} />
              </View>
            )}
          </View>
        </View>
      </View>

      {aiResult ? (
        <View style={styles.aiCard}>
          <Text style={styles.aiText}>{aiResult}</Text>
        </View>
      ) : null}

      {aiError ? <Text style={styles.error}>{aiError}</Text> : null}

      {analyzing ? (
        <ActivityIndicator color={colors.textPrimary} style={styles.loader} />
      ) : (
        <Button
          title={t('goalScreenAiAnalyze', lang)}
          onPress={handleAnalyze}
          disabled={!canAnalyze}
          variant="secondary"
          style={styles.analyzeBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  photoBox: {
    aspectRatio: 1024 / 1536,
    borderRadius: layout.cardRadius,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  meta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  day: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  date: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 10,
  },
  aiCard: {
    padding: 14,
    borderRadius: layout.cardRadius,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  aiText: {
    ...typography.body,
    lineHeight: 22,
  },
  error: {
    ...typography.caption,
    color: colors.accent,
  },
  loader: {
    marginVertical: 8,
  },
  analyzeBtn: {
    marginTop: 4,
  },
});
