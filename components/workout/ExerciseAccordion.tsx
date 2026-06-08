// 운동 종목 아코디언: 접힘(요약) / 펼침(세트 목록 + 세트 추가)
// 보더 색상은 피로도에 따라 변함 (none=회색, good=초록, caution=주황, overload=빨강)
import { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  ExerciseRestSeconds,
  FatigueLevel,
  Language,
  ResistanceType,
  SetData,
  WorkoutExercise,
} from '../../types';
import { EXERCISE_REST_OPTIONS } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { FATIGUE_COLORS } from '../../lib/fatigue';
import { muscleGroupLabel } from '../../constants/muscles';
import { t, type StringKey } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { useRestTimerStore } from '../../stores/restTimerStore';
import { useCustomExerciseStore } from '../../stores/customExerciseStore';
import { getExerciseDbId, workoutExerciseToDef } from '../../lib/exerciseCatalog';
import { SetRow } from './SetRow';
import { SwipeRow } from './SwipeRow';
import { HistorySheet } from './HistorySheet';
import { ExerciseDbThumb } from './ExerciseDbThumb';
import { ExerciseDetailSheet } from './ExerciseDetailSheet';

// 저항 타입 → i18n 키
const RESISTANCE_KEY: Record<ResistanceType, StringKey> = {
  weight: 'resistanceWeight',
  band: 'resistanceBand',
  bodyweight: 'resistanceBodyweight',
};

const resistanceLabel = (type: ResistanceType, lang: Language): string =>
  t(RESISTANCE_KEY[type], lang);

interface ExerciseAccordionProps {
  exercise: WorkoutExercise;
  fatigueLevel: FatigueLevel;
  expanded: boolean;
  onToggle: () => void;
  onSetUpdate: (setNumber: number, data: Partial<SetData>) => void;
  onSetAdd: () => void;
  onSetDelete: (setNumber: number) => void;
  onRestChange: (seconds: ExerciseRestSeconds) => void;
}

export function ExerciseAccordion({
  exercise,
  fatigueLevel,
  expanded,
  onToggle,
  onSetUpdate,
  onSetAdd,
  onSetDelete,
  onRestChange,
}: ExerciseAccordionProps) {
  const lang = useLanguage();
  const customExercises = useCustomExerciseStore((s) => s.exercises);
  const startRest = useRestTimerStore((s) => s.start);
  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const [historyVisible, setHistoryVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);

  const exerciseDef = useMemo(
    () => workoutExerciseToDef(exercise, customExercises),
    [exercise, customExercises]
  );

  // 세트 완료 시 휴식 타이머 시작
  const handleSetChange = (set: SetData, data: Partial<SetData>) => {
    onSetUpdate(set.setNumber, data);
    if (data.completed === true && !set.completed && exercise.defaultRestSeconds > 0) {
      startRest(exercise.id, exercise.exerciseName, exercise.defaultRestSeconds);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { borderColor: fatigueLevel === 'none' ? colors.border : FATIGUE_COLORS[fatigueLevel] },
      ]}
    >
      <View style={styles.header}>
        {/* 왼쪽: 정지 GIF 썸네일 — 탭하면 운동 디테일 모달 */}
        <Pressable
          style={({ pressed }) => [styles.thumbBtn, pressed && styles.thumbBtnPressed]}
          onPress={() => setDetailVisible(true)}
          hitSlop={4}
          accessibilityLabel={exercise.exerciseName[lang]}
        >
          <ExerciseDbThumb
            nameEn={exerciseDef.nameEn}
            exerciseDbId={getExerciseDbId(exerciseDef)}
            gifUrl={exerciseDef.gifUrl}
            variant="list"
          />
        </Pressable>

        {/* 타이틀 영역: 탭하면 접기/펼치기 */}
        <Pressable style={styles.headerToggle} onPress={onToggle}>
          <Text style={styles.name}>{exercise.exerciseName[lang]}</Text>
          <Text style={styles.meta}>
            {muscleGroupLabel(exercise.muscleGroup, lang)} ·{' '}
            {resistanceLabel(exercise.resistanceType, lang)} · {completedCount}/
            {exercise.sets.length} {t('setsDoneSuffix', lang)}
          </Text>
        </Pressable>

        <View style={styles.headerRight}>
          {/* History — 아이콘만 */}
          <Pressable
            style={({ pressed }) => [styles.historyIconBtn, pressed && styles.historyIconBtnPressed]}
            onPress={() => setHistoryVisible(true)}
            hitSlop={6}
            accessibilityLabel={t('history', lang)}
          >
            <Ionicons name="stats-chart-outline" size={18} color={colors.textPrimary} />
          </Pressable>

          <Pressable onPress={onToggle} hitSlop={8} style={styles.chevronBtn}>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <HistorySheet
        visible={historyVisible}
        exercise={exercise}
        onClose={() => setHistoryVisible(false)}
      />

      <ExerciseDetailSheet
        exercise={detailVisible ? exerciseDef : null}
        lang={lang}
        onClose={() => setDetailVisible(false)}
      />

      {expanded && (
        <View style={styles.body}>
          {/* 쉬는 시간 설정: 30 / 60 / 90 / 120초 */}
          <View style={styles.restRow}>
            <Ionicons name="timer-outline" size={16} color={colors.textMuted} />
            <Text style={styles.restLabel}>{t('restTime', lang)}</Text>
            <View style={styles.restChips}>
              {EXERCISE_REST_OPTIONS.map((sec) => {
                const active = exercise.defaultRestSeconds === sec;
                return (
                  <Pressable
                    key={sec}
                    style={[styles.restChip, active && styles.restChipActive]}
                    onPress={() => onRestChange(sec)}
                  >
                    <Text style={[styles.restChipText, active && styles.restChipTextActive]}>
                      {sec === 0 ? '—' : `${sec}s`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {exercise.sets.map((set) => (
            <SwipeRow key={set.setNumber} onDelete={() => onSetDelete(set.setNumber)}>
              <SetRow
                set={set}
                resistanceType={exercise.resistanceType}
                onChange={(data) => handleSetChange(set, data)}
              />
            </SwipeRow>
          ))}

          <Pressable style={styles.addSet} onPress={onSetAdd}>
            <Ionicons name="add" size={18} color={colors.textPrimary} />
            <Text style={styles.addSetText}>{t('addSet', lang)}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: layout.cardRadius,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 10,
  },
  thumbBtn: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbBtnPressed: {
    opacity: 0.85,
  },
  headerToggle: {
    flex: 1,
    paddingRight: 4,
  },
  name: {
    ...typography.listItem,
    fontSize: 16,
  },
  meta: {
    ...typography.caption,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconBtnPressed: {
    backgroundColor: colors.surface,
    opacity: 0.9,
  },
  chevronBtn: {
    paddingLeft: 4,
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  restLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  restChips: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
  },
  restChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  restChipActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.textPrimary,
  },
  restChipText: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textSecondary,
  },
  restChipTextActive: {
    color: colors.background,
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    marginTop: 4,
  },
  addSetText: {
    ...typography.button,
    color: colors.textPrimary,
  },
});
