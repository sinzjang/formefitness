import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../constants/theme';
import { useRoutineStore } from '../../stores/routineStore';
import { DEFAULT_REST_SECONDS, type Language, type RoutineExerciseEntry } from '../../types';
import type {
  PulseWorkoutExerciseSummary,
  PulseWorkoutSnapshot,
} from '../../lib/pulseWorkoutSnapshot';
import { Icon } from '../ui/Icon';

interface PulseWorkoutSnapshotCardProps {
  snapshot?: PulseWorkoutSnapshot;
  lang: Language;
}

function toRoutineExercise(exercise: PulseWorkoutExerciseSummary): RoutineExerciseEntry {
  return {
    exerciseKey: exercise.exerciseKey,
    exerciseName: {
      ko: exercise.exerciseName,
      en: exercise.exerciseName,
    },
    muscleGroup: exercise.muscleGroup,
    resistanceType: exercise.resistanceType,
    defaultRestSeconds: DEFAULT_REST_SECONDS,
  };
}

export function PulseWorkoutSnapshotCard({ snapshot, lang }: PulseWorkoutSnapshotCardProps) {
  const routines = useRoutineStore((state) =>
    state.routines
      .filter((routine) => routine.is_active !== false)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  );
  const addExerciseToRoutine = useRoutineStore((state) => state.addExerciseToRoutine);

  if (!snapshot?.exercises.length) return null;

  const handleAddToRoutine = (exercise: PulseWorkoutExerciseSummary) => {
    if (routines.length === 0) {
      Alert.alert(
        lang === 'ko' ? '루틴이 없습니다' : 'No routines yet',
        lang === 'ko'
          ? '먼저 Workout 탭에서 루틴을 만들어주세요.'
          : 'Create a routine from the Workout tab first.'
      );
      return;
    }

    const exerciseEntry = toRoutineExercise(exercise);
    Alert.alert(
      exercise.exerciseName,
      lang === 'ko' ? '어느 루틴에 추가할까요?' : 'Add this exercise to which routine?',
      [
        ...routines.slice(0, 8).map((routine) => ({
          text: routine.name,
          onPress: () => {
            addExerciseToRoutine(routine.id, exerciseEntry);
          },
        })),
        { text: lang === 'ko' ? '취소' : 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="barbell" size={15} color={colors.textPrimary} active />
        <Text style={styles.title}>{snapshot.title}</Text>
      </View>

      <View style={styles.rows}>
        {snapshot.exercises.map((exercise) => (
          <Pressable
            key={exercise.exerciseKey}
            style={styles.row}
            onPress={() => handleAddToRoutine(exercise)}
          >
            <Text style={styles.line} numberOfLines={1}>
              {exercise.line}
            </Text>
            <View style={styles.addCircle}>
              <Icon name="add" size={13} color={colors.background} active />
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...typography.listItem,
    fontSize: 13,
    color: colors.textPrimary,
  },
  rows: {
    gap: 6,
  },
  row: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  line: {
    ...typography.caption,
    flex: 1,
    fontSize: 12,
    lineHeight: 15,
    color: colors.textPrimary,
  },
  addCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.textPrimary,
  },
});
