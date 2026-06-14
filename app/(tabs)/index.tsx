// Home 탭: 위클리 캘린더
import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { HomeDashboardGrid } from '../../components/home/HomeDashboardGrid';
import { RecentWorkoutHistory } from '../../components/home/RecentWorkoutHistory';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { WeeklyCalendar, countWorkoutsThisWeek } from '../../components/calendar/WeeklyCalendar';
import { Icon } from '../../components/ui/Icon';
import { PaywallModal } from '../../components/paywall/PaywallModal';

const WEEKLY_GOAL = 5;

// 플랜별 배지 색상 설정
const PLAN_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  free:  { bg: colors.surface,   text: colors.textSecondary, label: 'FREE'  },
  plus:  { bg: '#111111',        text: '#FFFFFF',            label: 'PLUS'  },
  prime: { bg: '#B8860B',        text: '#FFFFFF',            label: 'PRIME' },
  admin: { bg: colors.accent,    text: '#FFFFFF',            label: 'ADMIN' },
};

export default function HomeScreen() {
  const lang = useLanguage();
  const sessions = useHistoryStore((s) => s.sessions);
  const planId = useSubscriptionStore((s) => s.planId);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const weekCount = useMemo(() => {
    const map = useHistoryStore.getState().getWorkoutDayMap();
    return countWorkoutsThisWeek(map);
  }, [sessions]);

  const badge = PLAN_BADGE[planId] ?? PLAN_BADGE.free;
  const isPaid = planId === 'plus' || planId === 'prime' || planId === 'admin';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PaywallModal visible={paywallOpen} lang={lang} onClose={() => setPaywallOpen(false)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.logo}>KYNE</Text>
            {/* 구독 상태 배지 */}
            <Pressable
              style={[styles.planBadge, { backgroundColor: badge.bg }]}
              onPress={() => setPaywallOpen(true)}
              hitSlop={8}
            >
              {isPaid && (
                <Icon name="crown" size={11} color={badge.text} />
              )}
              <Text style={[styles.planBadgeText, { color: badge.text }]}>
                {badge.label}
              </Text>
            </Pressable>
          </View>
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
        </View>

        <HomeDashboardGrid lang={lang} />

        <RecentWorkoutHistory lang={lang} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 100,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    ...typography.heroTitle,
    fontSize: 40,
  },
  subtitle: {
    ...typography.body,
    marginTop: 4,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planBadgeText: {
    fontFamily: fonts.bold700,
    fontSize: 11,
    letterSpacing: 0.8,
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
});
