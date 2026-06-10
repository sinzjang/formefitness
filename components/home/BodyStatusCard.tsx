// Home — 전신 SVG + 최근 운동 부위 + 주간 게이지
import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, layout, muscleColors, fonts } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { getBodyHighlightForMuscleGroups } from '../../lib/muscleBodyMap';
import {
  getLastSessionMuscleGroups,
  getMuscleWeeklyProgress,
  getWeeklyMuscleSetCounts,
  HOME_MUSCLE_GROUPS,
} from '../../lib/homeStats';
import type { Language } from '../../types';
import { useHistoryStore } from '../../stores/historyStore';
import { HomeBodyMap } from './HomeBodyMap';
import { MuscleGauge } from './MuscleGauge';

interface BodyStatusCardProps {
  lang: Language;
}

export function BodyStatusCard({ lang }: BodyStatusCardProps) {
  const sessions = useHistoryStore((s) => s.sessions);
  const [side, setSide] = useState<'front' | 'back'>('front');

  const lastMuscles = useMemo(() => getLastSessionMuscleGroups(sessions), [sessions]);
  const weeklyCounts = useMemo(() => getWeeklyMuscleSetCounts(sessions), [sessions]);

  const bodyData = useMemo(
    () =>
      getBodyHighlightForMuscleGroups(lastMuscles, side, (g) => muscleColors[g]),
    [lastMuscles, side]
  );

  return (
    <View style={styles.card}>
      <Text style={styles.lastLabel}>{t('homeLastWorkout', lang)}</Text>

      <View style={styles.toggleRow}>
        <Pressable style={styles.toggleTab} onPress={() => setSide('front')}>
          <Text style={[styles.toggleText, side === 'front' && styles.toggleTextActive]}>
            {t('homeBodyFront', lang)}
          </Text>
          {side === 'front' ? <View style={styles.toggleUnderline} /> : <View style={styles.toggleUnderlineSpacer} />}
        </Pressable>
        <Pressable style={styles.toggleTab} onPress={() => setSide('back')}>
          <Text style={[styles.toggleText, side === 'back' && styles.toggleTextActive]}>
            {t('homeBodyBack', lang)}
          </Text>
          {side === 'back' ? <View style={styles.toggleUnderline} /> : <View style={styles.toggleUnderlineSpacer} />}
        </Pressable>
      </View>

      <HomeBodyMap side={side} data={bodyData} />

      <View style={styles.gaugeGrid}>
        {HOME_MUSCLE_GROUPS.map((group) => (
          <MuscleGauge
            key={group}
            group={group}
            setCount={weeklyCounts[group]}
            progress={getMuscleWeeklyProgress(group, weeklyCounts[group])}
            lang={lang}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 2,
    borderRadius: layout.cardRadius,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
    minHeight: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'center',
    marginBottom: 4,
  },
  toggleTab: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  toggleText: {
    ...typography.caption,
    fontSize: 8,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  toggleTextActive: {
    color: colors.textPrimary,
    fontFamily: fonts.bold700,
    fontWeight: '700',
  },
  toggleUnderline: {
    marginTop: 3,
    width: '100%',
    height: 1.5,
    backgroundColor: colors.textPrimary,
    borderRadius: 1,
  },
  toggleUnderlineSpacer: {
    marginTop: 3,
    height: 1.5,
  },
  lastLabel: {
    ...typography.caption,
    fontFamily: fonts.bold700,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  gaugeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
