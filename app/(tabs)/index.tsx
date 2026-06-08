// Home 탭: 위클리 캘린더 + AI 코치 채팅
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage, useSettingsStore } from '../../stores/settingsStore';
import { useHistoryStore } from '../../stores/historyStore';
import { WeeklyCalendar, countWorkoutsThisWeek } from '../../components/calendar/WeeklyCalendar';
import { CoachChat } from '../../components/coach/CoachChat';

const WEEKLY_GOAL = 5;

export default function HomeScreen() {
  const lang = useLanguage();
  const coachName = useSettingsStore((s) => s.coachName);
  const sessions = useHistoryStore((s) => s.sessions);

  const weekCount = useMemo(() => {
    const map = useHistoryStore.getState().getWorkoutDayMap();
    return countWorkoutsThisWeek(map);
  }, [sessions]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.body}>
        <View style={styles.topSection}>
          <View style={styles.header}>
            <Text style={styles.logo}>FORMÉ</Text>
            <Text style={styles.subtitle}>{t('homeTagline', lang)}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('thisWeek', lang)}</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardValue}>
                {weekCount} / {WEEKLY_GOAL}
              </Text>
              <View style={styles.cardCalendar}>
                <WeeklyCalendar lang={lang} variant="compact" />
              </View>
            </View>
            <Text style={styles.cardHint}>{t('homeCardHint', lang)}</Text>
          </View>
        </View>

        <CoachChat lang={lang} coachName={coachName} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 8,
  },
  topSection: {
    flexShrink: 0,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  logo: {
    ...typography.heroTitle,
    fontSize: 40,
  },
  subtitle: {
    ...typography.body,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: layout.cardRadius,
    padding: 20,
  },
  cardLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  cardValue: {
    ...typography.heroTitle,
    fontSize: 36,
    flexShrink: 0,
  },
  cardCalendar: {
    flex: 1,
    minWidth: 0,
  },
  cardHint: {
    ...typography.body,
  },
});
