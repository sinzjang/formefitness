// Progress — Streak 패널 (플레이스홀더)
import { View, Text, StyleSheet } from 'react-native';
import type { Language } from '../../types';
import { colors, typography, layout, fonts } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { getCurrentWeekDays, isSameDay, toLocalDateKey } from '../../lib/dates';
import type { WorkoutDayInfo } from '../../stores/historyStore';
import { calcCurrentStreak, countWorkoutsInMonth } from '../../lib/progressStats';
import { Icon } from '../ui/Icon';

interface StreakPanelProps {
  lang: Language;
  viewMonth: Date;
  dayMap: Record<string, WorkoutDayInfo>;
}

export function StreakPanel({ lang, viewMonth, dayMap }: StreakPanelProps) {
  const currentStreak = calcCurrentStreak(dayMap);
  const monthCount = countWorkoutsInMonth(dayMap, viewMonth);
  const weekDays = getCurrentWeekDays();

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <Icon name="barbell" size={22} color={colors.accent} active />
        </View>
        <Text style={styles.heroLabel}>{t('progressCurrentStreak', lang)}</Text>
        <Text style={styles.heroValue}>{currentStreak}</Text>
        <Text style={styles.heroUnit}>{t('progressDaysUnit', lang)}</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('progressThisMonth', lang)}</Text>
          <Text style={styles.statValue}>{monthCount}</Text>
          <Text style={styles.statHint}>{t('progressWorkoutDays', lang)}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>{t('progressLongestStreak', lang)}</Text>
          <Text style={styles.statValue}>—</Text>
          <Text style={styles.statHint}>{t('progressComingSoon', lang)}</Text>
        </View>
      </View>

      <View style={styles.weekCard}>
        <Text style={styles.sectionTitle}>{t('thisWeek', lang)}</Text>
        <View style={styles.weekRow}>
          {weekDays.map((date) => {
            const workedOut = dayMap[toLocalDateKey(date)]?.workedOut;
            const today = isSameDay(date, new Date());
            return (
              <View key={toLocalDateKey(date)} style={styles.weekDay}>
                <View
                  style={[
                    styles.weekDot,
                    workedOut && styles.weekDotActive,
                    today && styles.weekDotToday,
                  ]}
                />
                <Text style={[styles.weekLabel, today && styles.weekLabelToday]}>
                  {date.getDate()}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 20,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 77, 28, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroValue: {
    fontFamily: fonts.black900Italic,
    fontSize: 56,
    color: colors.textPrimary,
    lineHeight: 60,
    marginTop: 4,
  },
  heroUnit: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 14,
    backgroundColor: colors.background,
  },
  statLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  statValue: {
    ...typography.sectionHeader,
    fontSize: 28,
  },
  statHint: {
    ...typography.caption,
    marginTop: 4,
  },
  weekCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 14,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  weekDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  weekDotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  weekDotToday: {
    borderColor: colors.textPrimary,
  },
  weekLabel: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textSecondary,
    fontSize: 11,
  },
  weekLabelToday: {
    color: colors.textPrimary,
  },
});
