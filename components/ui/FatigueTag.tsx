// 피로도 태그: 색상 도트 + (선택) 라벨
import { View, Text, StyleSheet } from 'react-native';
import type { FatigueLevel } from '../../types';
import { FATIGUE_COLORS } from '../../lib/fatigue';
import { typography } from '../../constants/theme';

const FATIGUE_LABEL_KO: Record<FatigueLevel, string> = {
  none: '미사용',
  good: '양호',
  caution: '주의',
  overload: '과부하',
};

interface FatigueTagProps {
  level: FatigueLevel;
  showLabel?: boolean;
}

export function FatigueTag({ level, showLabel = false }: FatigueTagProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: FATIGUE_COLORS[level] }]} />
      {showLabel && <Text style={styles.label}>{FATIGUE_LABEL_KO[level]}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  label: {
    ...typography.caption,
    marginLeft: 6,
  },
});
