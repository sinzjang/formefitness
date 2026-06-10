// Modal 전용 Safe Area — Modal은 별도 뷰 계층이라 Provider를 다시 감싸야 인셋이 적용됨
import { type ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context';
import { colors } from '../../constants/theme';

interface ModalSafeAreaProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
}

export function ModalSafeArea({
  children,
  style,
  edges = ['top', 'bottom'],
}: ModalSafeAreaProps) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.root, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
