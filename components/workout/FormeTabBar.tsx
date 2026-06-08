// 커스텀 탭바 — 세션 도크 + 기본 하단 네비게이션
import { View } from 'react-native';
import { BottomTabBar, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { ActiveSessionDock } from './ActiveSessionDock';

export function FormeTabBar(props: BottomTabBarProps) {
  return (
    <View>
      <ActiveSessionDock />
      <BottomTabBar {...props} />
    </View>
  );
}
