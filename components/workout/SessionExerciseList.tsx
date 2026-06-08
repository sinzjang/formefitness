// 세션 운동 리스트 — 6점 그립 드래그로 순서 변경
import type { ReactNode } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import type { ExerciseRestSeconds, MuscleGroup, SetData, WorkoutExercise } from '../../types';
import { getFatigueLevel } from '../../lib/fatigue';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { ExerciseAccordion } from './ExerciseAccordion';
import { DragHandle } from './DragHandle';

interface SessionExerciseListProps {
  exercises: WorkoutExercise[];
  fatigueCounts: Record<MuscleGroup, number>;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onReorder: (exercises: WorkoutExercise[]) => void;
  onSetUpdate: (exerciseId: string, setNumber: number, data: Partial<SetData>) => void;
  onSetAdd: (exerciseId: string) => void;
  onSetDelete: (exerciseId: string, setNumber: number) => void;
  onRestChange: (exerciseId: string, seconds: ExerciseRestSeconds) => void;
  listFooter?: ReactNode;
  contentContainerStyle?: object;
}

export function SessionExerciseList({
  exercises,
  fatigueCounts,
  expandedId,
  onToggleExpand,
  onReorder,
  onSetUpdate,
  onSetAdd,
  onSetDelete,
  onRestChange,
  listFooter,
  contentContainerStyle,
}: SessionExerciseListProps) {
  const lang = useLanguage();

  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<WorkoutExercise>) => (
    <ScaleDecorator>
      <View style={[styles.rowWrap, isActive && styles.rowDragging]}>
        <Pressable
          onLongPress={drag}
          delayLongPress={120}
          style={styles.gripCol}
          hitSlop={6}
          accessibilityLabel={t('reorderExercise', lang)}
        >
          <DragHandle active={isActive} />
        </Pressable>
        <View style={styles.cardCol}>
          <ExerciseAccordion
            exercise={item}
            fatigueLevel={getFatigueLevel(item.muscleGroup, fatigueCounts[item.muscleGroup] ?? 0)}
            expanded={expandedId === item.id}
            onToggle={() => onToggleExpand(item.id)}
            onSetUpdate={(setNumber, data) => onSetUpdate(item.id, setNumber, data)}
            onSetAdd={() => onSetAdd(item.id)}
            onSetDelete={(setNumber) => onSetDelete(item.id, setNumber)}
            onRestChange={(seconds) => onRestChange(item.id, seconds)}
          />
        </View>
      </View>
    </ScaleDecorator>
  );

  return (
    <DraggableFlatList
      style={styles.list}
      data={exercises}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onDragEnd={({ data }) => onReorder(data)}
      activationDistance={8}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={contentContainerStyle}
      ListFooterComponent={listFooter ? () => <>{listFooter}</> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowDragging: {
    opacity: 0.92,
  },
  gripCol: {
    paddingTop: 22,
    paddingRight: 4,
    paddingLeft: 2,
  },
  cardCol: {
    flex: 1,
  },
});
