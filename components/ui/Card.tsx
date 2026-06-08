// 공통 카드: 흰 배경 + 0.5px 보더 + radius 12
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, layout } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: layout.borderWidth,
    borderRadius: layout.cardRadius,
    padding: 16,
  },
});
