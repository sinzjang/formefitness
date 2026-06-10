// Goal 스크린 상단 — 티어, D+N, 진행률
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, layout, typography } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';

interface GoalHeaderProps {
  lang: Language;
  tierName: string;
  dayIndex: number;
  progressPct: number;
  onEditPress: () => void;
}

export function GoalHeader({
  lang,
  tierName,
  dayIndex,
  progressPct,
  onEditPress,
}: GoalHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={styles.tier}>🎯 {tierName}</Text>
        <Text style={styles.day}>D+{dayIndex}</Text>
      </View>

      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progressPct}%` }]} />
      </View>
      <Text style={styles.pct}>
        {progressPct}% {t('goalScreenProgressAchieved', lang)}
      </Text>

      <Pressable onPress={onEditPress} hitSlop={8} style={styles.editBtn}>
        <Text style={styles.editText}>{t('goalBannerChange', lang)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 16,
    borderBottomWidth: layout.borderWidth,
    borderBottomColor: colors.border,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tier: {
    ...typography.sectionHeader,
    fontSize: 18,
    flex: 1,
  },
  day: {
    ...typography.listItem,
    color: colors.accent,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.textPrimary,
    borderRadius: 3,
  },
  pct: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  editBtn: {
    alignSelf: 'flex-end',
  },
  editText: {
    ...typography.caption,
    color: colors.accent,
    textDecorationLine: 'underline',
  },
});
