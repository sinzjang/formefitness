// 세션 운동 리스트 — 카드 내 그립으로 순서 변경
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import type { ExerciseRestSeconds, MuscleGroup, SetData, WorkoutExercise } from '../../types';
import { getFatigueLevel } from '../../lib/fatigue';
import { ExerciseAccordion } from './ExerciseAccordion';

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
  const renderItem = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<WorkoutExercise>) => (
    <ScaleDecorator>
      <ExerciseAccordion
        exercise={item}
        fatigueLevel={getFatigueLevel(item.muscleGroup, fatigueCounts[item.muscleGroup] ?? 0)}
        expanded={expandedId === item.id}
        onToggle={() => onToggleExpand(item.id)}
        onSetUpdate={(setNumber, data) => onSetUpdate(item.id, setNumber, data)}
        onSetAdd={() => onSetAdd(item.id)}
        onSetDelete={(setNumber) => onSetDelete(item.id, setNumber)}
        onRestChange={(seconds) => onRestChange(item.id, seconds)}
        onDrag={drag}
        isDragging={isActive}
      />
    </ScaleDecorator>
  );

  return (
    <DraggableFlatList
      style={styles.list}
      containerStyle={styles.listContainer}
      data={exercises}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onDragEnd={({ data }) => onReorder(data)}
      activationDistance={8}
      keyboardShouldPersistTaps="handled"
      // iOS 15+: 키보드가 올라오면 자동으로 스크롤 조정
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={contentContainerStyle}
      ListFooterComponent={listFooter ? () => <>{listFooter}</> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
});
