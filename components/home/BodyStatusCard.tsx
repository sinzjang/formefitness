// Home — 전신 SVG + 최근 운동 부위 + 주간 게이지
import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, layout, muscleColors } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { muscleGroupLabel } from '../../constants/muscles';
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

  const lastLabel =
    lastMuscles.length > 0
      ? lastMuscles.map((m) => muscleGroupLabel(m, lang)).join(', ')
      : t('homeLastWorkoutEmpty', lang);

  return (
    <View style={styles.card}>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, side === 'front' && styles.toggleBtnActive]}
          onPress={() => setSide('front')}
        >
          <Text style={[styles.toggleText, side === 'front' && styles.toggleTextActive]}>
            {t('homeBodyFront', lang)}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, side === 'back' && styles.toggleBtnActive]}
          onPress={() => setSide('back')}
        >
          <Text style={[styles.toggleText, side === 'back' && styles.toggleTextActive]}>
            {t('homeBodyBack', lang)}
          </Text>
        </Pressable>
      </View>

      <HomeBodyMap side={side} data={bodyData} />

      <Text style={styles.lastLabel} numberOfLines={1}>
        {t('homeLastWorkout', lang)}: {lastLabel}
      </Text>

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
    gap: 4,
    alignSelf: 'center',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  toggleText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  toggleTextActive: {
    color: colors.background,
  },
  lastLabel: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  gaugeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
