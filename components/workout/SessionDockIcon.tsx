// 세션 도크용 미니 덤벨 배지 — 브랜드 악센트 톤
import { View, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '../../constants/theme';

interface SessionDockIconProps {
  /** 휴식 중이면 배지 톤을 살짝 바꿈 */
  resting?: boolean;
  size?: number;
}

export function SessionDockIcon({ resting = false, size = 30 }: SessionDockIconProps) {
  const iconSize = Math.round(size * 0.55);

  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size / 2 },
        resting && styles.badgeResting,
      ]}
    >
      <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        {/* 왼쪽 원판 */}
        <Rect x="1.5" y="6.5" width="5.5" height="11" rx="2" fill={colors.accent} />
        {/* 그립 */}
        <Rect x="8" y="10.5" width="8" height="3" rx="1.5" fill={colors.textPrimary} opacity={0.9} />
        {/* 오른쪽 원판 */}
        <Rect x="17" y="6.5" width="5.5" height="11" rx="2" fill={colors.accent} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 77, 28, 0.22)',
  },
  badgeResting: {
    backgroundColor: 'rgba(255, 77, 28, 0.06)',
    borderColor: 'rgba(255, 77, 28, 0.14)',
  },
});
