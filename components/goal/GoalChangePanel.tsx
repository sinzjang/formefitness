// Goal 스크린 — 나의 변화 탭
import { useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { Language } from '../../types';
import type { GoalAnalysisResult, GoalCheckin, GoalWizardAnswers } from '../../types/goal';
import type { SavedWorkoutSession } from '../../types';
import { colors, layout, typography } from '../../constants/theme';
import { getDateWarning } from '../../lib/goalProgress';
import { analyzePhotoChange } from '../../lib/goalScreenAnalysis';
import { t } from '../../lib/i18n';
import { Button } from '../ui/Button';
import { GoalPhotoSlot } from './GoalPhotoSlot';

interface GoalChangePanelProps {
  lang: Language;
  checkins: GoalCheckin[];
  answers: GoalWizardAnswers;
  analysis: GoalAnalysisResult;
  sessions: SavedWorkoutSession[];
}

export function GoalChangePanel({
  lang,
  checkins,
  answers,
  analysis,
  sessions,
}: GoalChangePanelProps) {
  const sorted = useMemo(
    () => [...checkins].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()),
    [checkins]
  );

  const currentPhoto = sorted[sorted.length - 1];
  const [prevIndex, setPrevIndex] = useState(0);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    setPrevIndex(Math.max(0, sorted.length - 2));
  }, [sorted.length]);

  const prevPhoto = sorted.length >= 2 ? sorted[prevIndex] : undefined;
  const canSwipePrev = sorted.length >= 3;
  const dateWarning =
    prevPhoto && currentPhoto
      ? getDateWarning(prevPhoto.takenAt, currentPhoto.takenAt, lang)
      : null;

  const canAnalyze = !!(prevPhoto && currentPhoto);

  const handleAnalyze = async () => {
    if (!prevPhoto || !currentPhoto) return;
    setAnalyzing(true);
    setAiError(null);
    try {
      const text = await analyzePhotoChange(
        prevPhoto,
        currentPhoto,
        answers,
        analysis,
        sessions,
        lang
      );
      setAiResult(text);
    } catch (e) {
      console.warn('[GoalChangePanel]', e);
      setAiError(t('goalScreenAiError', lang));
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <GoalPhotoSlot
          label={t('goalScreenPrevPhoto', lang)}
          checkin={prevPhoto}
          emptyHint={t('goalScreenAddPhotoHint', lang)}
          showNavLeft={canSwipePrev && prevIndex > 0}
          showNavRight={canSwipePrev && prevIndex < sorted.length - 2}
          onNavLeft={() => setPrevIndex((i) => Math.max(0, i - 1))}
          onNavRight={() => setPrevIndex((i) => Math.min(sorted.length - 2, i + 1))}
        />
        <GoalPhotoSlot
          label={t('goalScreenCurrentPhoto', lang)}
          checkin={currentPhoto}
          emptyHint={t('goalScreenAddPhotoHint', lang)}
        />
      </View>

      {dateWarning ? (
        <Text
          style={[
            styles.warning,
            dateWarning.type === 'info' && styles.info,
          ]}
        >
          {dateWarning.message}
        </Text>
      ) : null}

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
  warning: {
    ...typography.caption,
    color: colors.accent,
    lineHeight: 18,
  },
  info: {
    color: colors.textSecondary,
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
