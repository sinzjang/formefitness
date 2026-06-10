// 부위별 주간 진행 게이지
import { View, Text, StyleSheet } from 'react-native';
import type { Language, MuscleGroup } from '../../types';
import { colors, typography } from '../../constants/theme';
import { muscleGroupLabel } from '../../constants/muscles';
import { muscleColors } from '../../constants/theme';

interface MuscleGaugeProps {
  group: MuscleGroup;
  progress: number;
  setCount: number;
  lang: Language;
}

export function MuscleGauge({ group, progress, setCount, lang }: MuscleGaugeProps) {
  const pct = Math.round(progress * 100);
  const color = muscleColors[group];

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>
          {muscleGroupLabel(group, lang)}
        </Text>
        <Text style={styles.count}>{setCount}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '48%',
    minWidth: 0,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
    gap: 4,
  },
  label: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textSecondary,
    flex: 1,
  },
  count: {
    ...typography.caption,
    fontSize: 9,
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});
