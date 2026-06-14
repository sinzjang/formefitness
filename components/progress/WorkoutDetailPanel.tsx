// Progress — Workout Detail 패널 (운동한 부위 + 운동 목록 + 세트 상세)
import { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import type { Language, SavedWorkoutSession } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { muscleGroupLabel } from '../../constants/muscles';
import { t } from '../../lib/i18n';
import { toLocalDateKey, isoToLocalDateKey } from '../../lib/dates';
import type { WorkoutDayInfo } from '../../stores/historyStore';
import { useCustomExerciseStore } from '../../stores/customExerciseStore';
import { Icon } from '../ui/Icon';
import { ExerciseDbThumb } from '../workout/ExerciseDbThumb';

interface WorkoutDetailPanelProps {
  lang: Language;
  selectedDate: Date;
  dayMap: Record<string, WorkoutDayInfo>;
  sessions: SavedWorkoutSession[];
}

export function WorkoutDetailPanel({
  lang,
  selectedDate,
  dayMap,
  sessions,
}: WorkoutDetailPanelProps) {
  const dateKey = toLocalDateKey(selectedDate);
  const dayInfo = dayMap[dateKey];

  // 해당 날짜 세션들 필터링 (startedAt 우선, 없으면 endedAt)
  const daySessions = sessions.filter(
    (s) => isoToLocalDateKey(s.startedAt ?? s.endedAt) === dateKey
  );

  const dateLabel =
    lang === 'ko'
      ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`
      : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const yearLabel = selectedDate.getFullYear().toString();

  if (!dayInfo?.workedOut) {
    return (
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.dateTitle}>{dateLabel}</Text>
          <Text style={styles.dateSub}>{yearLabel}</Text>
        </View>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('progressNoWorkoutDay', lang)}</Text>
          <Text style={styles.emptyBody}>{t('progressSelectDayHint', lang)}</Text>
        </View>
      </View>
    );
  }

  // 운동한 근육 그룹만 (중복 제거)
  const activeMuscles = dayInfo.muscles;

  // 전체 운동 목록 (중복 없이 세션 순서대로)
  const allExercises = daySessions.flatMap((s) => s.exercises);

  return (
    <View style={styles.container}>
      {/* 날짜 헤더 */}
      <View style={styles.headerCard}>
        <Text style={styles.dateTitle}>{dateLabel}</Text>
        <Text style={styles.dateSub}>{yearLabel}</Text>
      </View>

      {/* 운동한 근육 그룹 태그 */}
      {activeMuscles.length > 0 && (
        <View style={styles.muscleTags}>
          {activeMuscles.map((muscle) => (
            <View key={muscle} style={styles.muscleTag}>
              <Text style={styles.muscleTagText}>
                {muscleGroupLabel(muscle, lang).toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 운동 목록 */}
      {allExercises.length > 0 ? (
        <View style={styles.exerciseList}>
          {allExercises.map((ex, idx) => (
            <ExerciseRow key={`${ex.exerciseKey}-${idx}`} exercise={ex} lang={lang} />
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyBody}>
            {lang === 'ko' ? '운동 세부 정보 없음' : 'No exercise details recorded'}
          </Text>
        </View>
      )}
    </View>
  );
}

function ExerciseRow({
  exercise,
  lang,
}: {
  exercise: SavedWorkoutSession['exercises'][number];
  lang: Language;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedSets = exercise.sets.filter((s) => s.completed).length;
  const name = exercise.exerciseName[lang] ?? exercise.exerciseName.en ?? '';

  // 커스텀 운동인 경우 store에서 mediaUri 조회 (exerciseKey = "custom:<id>")
  const customExercises = useCustomExerciseStore((s) => s.exercises);
  const customMediaUri = (() => {
    if (!exercise.exerciseKey.startsWith('custom:')) return undefined;
    const customId = exercise.exerciseKey.slice('custom:'.length);
    return customExercises.find((c) => c.id === customId)?.mediaUri;
  })();

  return (
    <Pressable
      style={({ pressed }) => [styles.exerciseRow, pressed && styles.exerciseRowPressed]}
      onPress={() => setExpanded((v) => !v)}
    >
      <View style={styles.exerciseHeader}>
        {/* 썸네일 — 커스텀은 자체 이미지, 카탈로그는 ExerciseDB */}
        {customMediaUri ? (
          <Image
            source={{ uri: customMediaUri }}
            style={styles.customThumb}
            resizeMode="cover"
          />
        ) : (
          <ExerciseDbThumb
            nameEn={exercise.exerciseName.en}
            variant="list"
            width={44}
            height={44}
            borderRadius={8}
          />
        )}
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{name}</Text>
          <Text style={styles.exerciseMeta}>
            {muscleGroupLabel(exercise.muscleGroup, lang)} · {completedSets}
            {lang === 'ko' ? '세트' : ' sets'}
          </Text>
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textSecondary}
        />
      </View>

      {expanded && (
        <View style={styles.setsContainer}>
          {exercise.sets.map((set) => (
            <View key={set.setNumber} style={styles.setRow}>
              <Text style={styles.setNum}>{set.setNumber}</Text>
              <Text style={[styles.setData, !set.completed && styles.setDataIncomplete]}>
                {set.reps > 0 ? `${set.reps} reps` : '—'}
                {set.weightLb != null && set.weightLb > 0
                  ? ` · ${(set.weightLb * 0.4536).toFixed(1)} kg`
                  : ''}
                {set.bandLevel != null ? ` · ${set.bandLevel}` : ''}
              </Text>
              {set.completed && (
                <Icon name="check" size={12} color={colors.accent} />
              )}
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  headerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 16,
    backgroundColor: colors.background,
  },
  dateTitle: {
    ...typography.sectionHeader,
    fontSize: 18,
    textTransform: 'none',
    letterSpacing: 0,
  },
  dateSub: {
    ...typography.caption,
    marginTop: 2,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    ...typography.listItem,
    marginBottom: 6,
  },
  emptyBody: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  muscleTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleTagText: {
    ...typography.caption,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.textPrimary,
  },
  customThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  exerciseList: {
    gap: 6,
  },
  exerciseRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 12,
    backgroundColor: colors.background,
  },
  exerciseRowPressed: {
    opacity: 0.75,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    ...typography.listItem,
    fontSize: 14,
  },
  exerciseMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  setsContainer: {
    marginTop: 10,
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  setNum: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    width: 20,
    textAlign: 'center',
  },
  setData: {
    ...typography.body,
    fontSize: 13,
    flex: 1,
  },
  setDataIncomplete: {
    color: colors.textSecondary,
  },
});
