// 스와이프(왼쪽으로 밀기) 삭제 래퍼
// 네이티브 제스처 라이브러리 없이 RN 내장 PanResponder + Animated만 사용 → 재빌드 불필요
import { useRef, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { colors, typography } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';

const SCREEN_W = Dimensions.get('window').width;
const OPEN_X = -84; // 삭제 버튼이 보이는 열림 위치
const TRIGGER_X = -140; // 이 이상 끌면 바로 삭제

interface SwipeRowProps {
  children: ReactNode;
  onDelete: () => void;
}

export function SwipeRow({ children, onDelete }: SwipeRowProps) {
  const lang = useLanguage();
  const translateX = useRef(new Animated.Value(0)).current;
  // 현재 열림 여부(닫힌 상태에서 시작 오프셋 계산용)
  const openRef = useRef(false);

  const animateTo = (toValue: number, after?: () => void) => {
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start(after);
  };

  const remove = () => {
    Animated.timing(translateX, {
      toValue: -SCREEN_W,
      duration: 180,
      useNativeDriver: true,
    }).start(() => onDelete());
  };

  const pan = useRef(
    PanResponder.create({
      // 가로 이동이 분명할 때만 제스처 가로채기 (세로 스크롤/탭은 통과)
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        const base = openRef.current ? OPEN_X : 0;
        const next = Math.min(0, Math.max(base + g.dx, -160));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const base = openRef.current ? OPEN_X : 0;
        const finalX = base + g.dx;
        if (finalX <= TRIGGER_X) {
          remove();
        } else if (finalX <= OPEN_X / 2) {
          openRef.current = true;
          animateTo(OPEN_X);
        } else {
          openRef.current = false;
          animateTo(0);
        }
      },
    })
  ).current;

  return (
    <View style={styles.wrap}>
      {/* 뒤 배경: 삭제 버튼 (열린 상태에서 탭하면 삭제) */}
      <View style={styles.deleteBg}>
        <Pressable style={styles.deleteBtn} onPress={remove}>
          <Icon name="trash" size={18} color={colors.background} />
          <Text style={styles.deleteText}>{t('delete', lang)}</Text>
        </Pressable>
      </View>

      {/* 앞 레이어: 실제 내용 (불투명 배경으로 뒤 배경을 가림) */}
      <Animated.View
        style={[styles.front, { transform: [{ translateX }] }]}
        {...pan.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  deleteBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.danger,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 84,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  deleteText: {
    ...typography.caption,
    color: colors.background,
  },
  front: {
    backgroundColor: colors.background,
  },
});
