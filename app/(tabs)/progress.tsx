// Progress 탭 — 달력 + Streak / Workout Detail 세그먼트 + Goal 배너
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { ProgressCalendar } from '../../components/progress/ProgressCalendar';
import { WorkoutDetailPanel } from '../../components/progress/WorkoutDetailPanel';
import { GoalBanner } from '../../components/progress/GoalBanner';
import { GoalWizardModal } from '../../components/goal/GoalWizardModal';
import { GoalScreen } from '../../components/goal/GoalScreen';
import { useGoalStore } from '../../stores/goalStore';

export default function ProgressScreen() {
  const lang = useLanguage();
  const sessions = useHistoryStore((s) => s.sessions);
  const saveManualSession = useHistoryStore((s) => s.saveManualSession);
  const startManualSession = useWorkoutStore((s) => s.startManualSession);
  const router = useRouter();
  const dayMap = useMemo(() => useHistoryStore.getState().getWorkoutDayMap(), [sessions]);

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

  const handleAddWorkout = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const isFuture = target > today;
    if (isFuture) {
      Alert.alert(
        t('addManualWorkout', lang),
        lang === 'ko' ? '미래 날짜에는 운동을 추가할 수 없습니다.' : 'Cannot add a workout for a future date.',
        [{ text: t('cancel', lang), style: 'cancel' }]
      );
      return;
    }
    // 달력에 즉시 표시 + 앱 재시작 후에도 유지 (운동 없는 체크인)
    saveManualSession(date);
    // 운동 화면 열기 (운동 추가 가능, 세트 기록 시 세션 교체 저장)
    startManualSession(date);
    router.navigate('/(tabs)/workout');
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
          onAddWorkout={handleAddWorkout}
        />

        <WorkoutDetailPanel
          lang={lang}
          selectedDate={selectedDate}
          dayMap={dayMap}
          sessions={sessions}
        />
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
});
