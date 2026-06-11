// Workout 탭: 장소(GYM/HOME/+) → Routine → 세션 로깅
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/ui/Icon';
import type { MuscleGroup, WorkoutRoutine } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { exerciseLocalizedName } from '../../constants/exercises';
import { exerciseResistanceType } from '../../lib/exerciseCatalog';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useRestTimerStore } from '../../stores/restTimerStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useLocationStore } from '../../stores/locationStore';
import { useRoutineStore } from '../../stores/routineStore';
import { useLanguage } from '../../stores/settingsStore';
import { Button } from '../../components/ui/Button';
import { ExercisePicker } from '../../components/workout/ExercisePicker';
import { SessionExerciseList } from '../../components/workout/SessionExerciseList';
import { SessionTimerBar } from '../../components/workout/SessionTimerBar';
import { LocationTabs } from '../../components/workout/LocationTabs';
import { RoutineSection } from '../../components/workout/RoutineSection';
import { SessionTimeEditModal } from '../../components/workout/SessionTimeEditModal';

export default function WorkoutScreen() {
  const lang = useLanguage();
  const session = useWorkoutStore((s) => s.session);
  const sessionScreenOpen = useWorkoutStore((s) => s.sessionScreenOpen);
  const startSession = useWorkoutStore((s) => s.startSession);
  const beginSession = useWorkoutStore((s) => s.beginSession);
  const closeSessionScreen = useWorkoutStore((s) => s.closeSessionScreen);
  const openSessionScreen = useWorkoutStore((s) => s.openSessionScreen);
  const endSession = useWorkoutStore((s) => s.endSession);
  const reset = useWorkoutStore((s) => s.reset);
  const addExercise = useWorkoutStore((s) => s.addExercise);
  const addSet = useWorkoutStore((s) => s.addSet);
  const deleteSet = useWorkoutStore((s) => s.deleteSet);
  const updateSet = useWorkoutStore((s) => s.updateSet);
  const setRestSeconds = useWorkoutStore((s) => s.setRestSeconds);
  const reorderExercises = useWorkoutStore((s) => s.reorderExercises);
  const resetRestTimer = useRestTimerStore((s) => s.reset);
  const saveSession = useHistoryStore((s) => s.saveSession);
  const selectedLocationId = useLocationStore((s) => s.selectedLocationId);
  const archiveRoutine = useRoutineStore((s) => s.archiveRoutine);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [timeEditSessionId, setTimeEditSessionId] = useState<string | null>(null);

  const isRunning = Boolean(session?.runningStartedAt);
  const showSessionScreen = Boolean(session && sessionScreenOpen);

  const clearSession = () => {
    resetRestTimer();
    reset();
    setExpandedId(null);
    setPickerVisible(false);
  };

  const handleFinishSession = () => {
    if (session) {
      endSession();
      const ended = useWorkoutStore.getState().session;
      if (ended) {
        saveSession(ended);
        setTimeEditSessionId(ended.id);
      }
    }
    clearSession();
  };

  // 루틴 선택 → 세션 준비 + 프리셋 운동 로드
  const handleStartRoutine = (routine: WorkoutRoutine) => {
    if (session?.runningStartedAt) {
      Alert.alert(t('activeSessionHint', lang), t('tapToResume', lang));
      return;
    }
    if (session && !session.runningStartedAt) {
      Alert.alert(t('exitSession', lang), t('exitSessionConfirm', lang), [
        { text: t('cancel', lang), style: 'cancel' },
        {
          text: t('exit', lang),
          style: 'destructive',
          onPress: () => {
            clearSession();
            startSession(selectedLocationId, routine.id);
            routine.exercises.forEach((ex) => {
              addExercise(
                ex.exerciseName,
                ex.muscleGroup,
                ex.resistanceType,
                ex.defaultRestSeconds,
                ex.customId
              );
            });
          },
        },
      ]);
      return;
    }

    startSession(selectedLocationId, routine.id);
    routine.exercises.forEach((ex) => {
      addExercise(
        ex.exerciseName,
        ex.muscleGroup,
        ex.resistanceType,
        ex.defaultRestSeconds,
        ex.customId
      );
    });
  };

  // 루틴 보관 — 목록에서 숨김 (현재 세션은 유지)
  const handleArchiveRoutine = () => {
    const routineId = session?.routineId;
    if (!routineId) return;

    Alert.alert(t('archiveRoutine', lang), t('archiveRoutineConfirm', lang), [
      { text: t('cancel', lang), style: 'cancel' },
      {
        text: t('archive', lang),
        style: 'destructive',
        onPress: () => archiveRoutine(routineId),
      },
    ]);
  };

  // X — 뒤로가기 (세션 유지, 화면만 닫음)
  const handleBack = () => {
    if (isRunning) {
      closeSessionScreen();
      return;
    }

    Alert.alert(t('exitSession', lang), t('exitSessionConfirm', lang), [
      { text: t('cancel', lang), style: 'cancel' },
      {
        text: t('exit', lang),
        style: 'destructive',
        onPress: clearSession,
      },
    ]);
  };

  const timeEditModal = (
    <SessionTimeEditModal
      visible={!!timeEditSessionId}
      sessionId={timeEditSessionId}
      lang={lang}
      onClose={() => setTimeEditSessionId(null)}
    />
  );

  // 세션 화면 밖: 장소 탭 + 루틴 목록
  if (!showSessionScreen) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={[styles.title, styles.titlePad]}>{t('workout', lang)}</Text>
        {isRunning && (
          <Pressable
            style={({ pressed }) => [styles.activeBanner, pressed && styles.activeBannerPressed]}
            onPress={openSessionScreen}
          >
            <Icon name="barbell" size={16} color={colors.accent} active />
            <Text style={styles.activeBannerText}>{t('activeSessionHint', lang)}</Text>
            <Icon name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        )}
        <View style={styles.locationPanel}>
          <LocationTabs />
          <View style={styles.locationPanelBody}>
            <RoutineSection locationId={selectedLocationId} onStartRoutine={handleStartRoutine} />
          </View>
        </View>
        {timeEditModal}
      </SafeAreaView>
    );
  }

  // 근육 그룹별 완료 세트 수 → 피로도 계산
  const fatigueCounts = session!.exercises.reduce((acc, ex) => {
    const completed = ex.sets.filter((s) => s.completed).length;
    acc[ex.muscleGroup] = (acc[ex.muscleGroup] ?? 0) + completed;
    return acc;
  }, {} as Record<MuscleGroup, number>);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>{t('workout', lang)}</Text>
            <Text style={styles.exerciseCount}>
              {session!.exercises.length}
              {t('exerciseCountSuffix', lang)}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {session!.routineId && (
              <Pressable
                style={({ pressed }) => [styles.archiveBtn, pressed && styles.archiveBtnPressed]}
                onPress={handleArchiveRoutine}
                hitSlop={8}
                accessibilityLabel={t('archiveRoutine', lang)}
              >
                <Icon name="trash" size={22} color={colors.danger} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
              onPress={handleBack}
              hitSlop={8}
              accessibilityLabel={t('exitSession', lang)}
            >
              <Icon name="close" size={26} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {isRunning && session!.runningStartedAt && (
          <SessionTimerBar onEndSession={handleFinishSession} />
        )}

        {session!.exercises.length === 0 ? (
          <View style={[styles.flex, styles.scroll]}>
            <Text style={styles.hint}>{t('addExerciseHint', lang)}</Text>
            <Button
              title={t('addExercise', lang)}
              variant="secondary"
              onPress={() => setPickerVisible(true)}
              style={styles.addBtn}
            />
          </View>
        ) : (
          <View style={styles.listPanel}>
            <SessionExerciseList
              exercises={session!.exercises}
              fatigueCounts={fatigueCounts}
              expandedId={expandedId}
              onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
              onReorder={reorderExercises}
              onSetUpdate={updateSet}
              onSetAdd={addSet}
              onSetDelete={deleteSet}
              onRestChange={setRestSeconds}
              contentContainerStyle={styles.scroll}
              listFooter={
                <Button
                  title={t('addExercise', lang)}
                  variant="secondary"
                  onPress={() => setPickerVisible(true)}
                  style={styles.addBtn}
                />
              }
            />
          </View>
        )}

        {!isRunning && (
          <View style={styles.footer}>
            <Button title={t('beginSession', lang)} variant="primary" onPress={beginSession} />
          </View>
        )}
      </KeyboardAvoidingView>

      {pickerVisible ? (
        <ExercisePicker
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          onSelect={(ex) => {
            addExercise(
              exerciseLocalizedName(ex),
              ex.muscleGroup,
              exerciseResistanceType(ex),
              undefined,
              ex.customId
            );
          }}
        />
      ) : null}
      {timeEditModal}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  // FlatList가 flex 안에서 높이 0이 되지 않도록
  listPanel: {
    flex: 1,
    minHeight: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  archiveBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archiveBtnPressed: {
    opacity: 0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    opacity: 0.5,
  },
  title: {
    ...typography.sectionHeader,
    fontSize: 22,
  },
  titlePad: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
    paddingBottom: 8,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: layout.screenPadding,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.surface,
  },
  activeBannerPressed: {
    opacity: 0.85,
  },
  activeBannerText: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
    flex: 1,
  },
  locationPanel: {
    flex: 1,
  },
  locationPanelBody: {
    flex: 1,
    backgroundColor: colors.background,
  },
  exerciseCount: {
    ...typography.caption,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
    paddingBottom: 24,
  },
  hint: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: 16,
  },
  addBtn: {
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
});
