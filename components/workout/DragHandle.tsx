// 6점 드래그 그립 (2열 × 3행)
import { View, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

interface DragHandleProps {
  active?: boolean;
}

export function DragHandle({ active }: DragHandleProps) {
  return (
    <View style={[styles.grip, active && styles.gripActive]}>
      {Array.from({ length: 3 }).map((_, row) => (
        <View key={row} style={styles.row}>
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grip: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    gap: 3,
  },
  gripActive: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
});
