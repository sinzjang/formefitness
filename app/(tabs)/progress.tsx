// Progress 탭 — 달력 + Streak / Workout Detail 세그먼트 + Goal 배너
import { useMemo, useState } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { useHistoryStore } from '../../stores/historyStore';
import { ProgressCalendar } from '../../components/progress/ProgressCalendar';
import {
  ProgressSegmentTabs,
  type ProgressPanel,
} from '../../components/progress/ProgressSegmentTabs';
import { StreakPanel } from '../../components/progress/StreakPanel';
import { WorkoutDetailPanel } from '../../components/progress/WorkoutDetailPanel';
import { GoalBanner } from '../../components/progress/GoalBanner';
import { GoalWizardModal } from '../../components/goal/GoalWizardModal';
import { GoalScreen } from '../../components/goal/GoalScreen';
import { useGoalStore } from '../../stores/goalStore';

export default function ProgressScreen() {
  const lang = useLanguage();
  const sessions = useHistoryStore((s) => s.sessions);
  const dayMap = useMemo(() => useHistoryStore.getState().getWorkoutDayMap(), [sessions]);

  const [panel, setPanel] = useState<ProgressPanel>('streak');
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [goalWizardOpen, setGoalWizardOpen] = useState(false);
  const [goalScreenOpen, setGoalScreenOpen] = useState(false);
  const isGoalSetup = useGoalStore((s) => s.isSetup);

  const handleGoalPress = () => {
    if (isGoalSetup) setGoalScreenOpen(true);
    else setGoalWizardOpen(true);
  };

  const handleEditGoal = () => {
    useGoalStore.getState().clearGoal();
    setGoalWizardOpen(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{t('progress', lang)}</Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <GoalBanner lang={lang} onPress={handleGoalPress} />

        <ProgressCalendar
          lang={lang}
          viewMonth={viewMonth}
          selectedDate={selectedDate}
          dayMap={dayMap}
          onViewMonthChange={setViewMonth}
          onSelectDate={setSelectedDate}
        />

        <View style={styles.tabsWrap}>
          <ProgressSegmentTabs lang={lang} value={panel} onChange={setPanel} />
        </View>

        {panel === 'streak' ? (
          <StreakPanel lang={lang} viewMonth={viewMonth} dayMap={dayMap} />
        ) : (
          <WorkoutDetailPanel lang={lang} selectedDate={selectedDate} dayMap={dayMap} />
        )}
      </ScrollView>

      <GoalWizardModal
        visible={goalWizardOpen}
        lang={lang}
        onClose={() => setGoalWizardOpen(false)}
      />

      <GoalScreen
        visible={goalScreenOpen}
        lang={lang}
        onClose={() => setGoalScreenOpen(false)}
        onEditGoal={handleEditGoal}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.sectionHeader,
    fontSize: 22,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 32,
    gap: 16,
  },
  tabsWrap: {
    marginTop: 4,
  },
});
