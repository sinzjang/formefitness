// react-native-body-highlighter 래퍼 — 운동 부위 시각화 (영역별 크롭)
import { View, StyleSheet, UIManager, Platform } from 'react-native';
import { Icon } from '../ui/Icon';
import Body from 'react-native-body-highlighter';
import type { MuscleGroup } from '../../types';
import { colors, muscleColors } from '../../constants/theme';
import {
  getBodyHighlightForMuscle,
  getBodyHighlightForMuscles,
  getBodyRegion,
} from '../../lib/muscleBodyMap';
import { getBodyViewport } from '../../lib/bodyViewport';

type MuscleBodySize = 'thumb' | 'card' | 'hero';

interface MuscleBodyViewProps {
  muscleKeys?: string[];
  muscleKey?: string;
  muscleGroup?: MuscleGroup;
  size?: MuscleBodySize;
  empty?: boolean;
  fill?: boolean;
}

const SIZE_BOX: Record<MuscleBodySize, { width: number; height: number }> = {
  thumb: { width: 52, height: 52 },
  card: { width: 100, height: 120 },
  hero: { width: 0, height: 160 },
};

function isSvgNativeAvailable(): boolean {
  if (Platform.OS === 'web') return true;
  return UIManager.getViewManagerConfig?.('RNSVGSvgView') != null;
}

const svgAvailable = isSvgNativeAvailable();

export function MuscleBodyView({
  muscleKeys,
  muscleKey,
  muscleGroup,
  size = 'thumb',
  empty = false,
  fill = false,
}: MuscleBodyViewProps) {
  const box = SIZE_BOX[size];
  const highlightColor = muscleGroup ? muscleColors[muscleGroup] : colors.accent;

  const keys = muscleKey ? [muscleKey] : (muscleKeys ?? []);
  const region = empty ? 'upper' : getBodyRegion(keys, muscleGroup);
  const viewport = getBodyViewport(region, size);

  const highlight = muscleKey
    ? getBodyHighlightForMuscle(muscleKey, muscleGroup, highlightColor)
    : getBodyHighlightForMuscles(muscleKeys ?? [], muscleGroup, highlightColor);

  const data = empty ? [] : highlight.data;
  const side = empty ? 'front' : highlight.side;

  const wrapStyle = fill
    ? styles.fill
    : size === 'hero'
      ? styles.heroWrap
      : { width: box.width, height: box.height };

  if (!svgAvailable) {
    return (
      <View style={[styles.wrap, wrapStyle, styles.fallback]}>
        <Icon
          name="body"
          size={size === 'thumb' ? 26 : size === 'card' ? 40 : 56}
          color={empty ? colors.textMuted : highlightColor}
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, wrapStyle]}>
      <View style={[styles.clip, fill && styles.clipFill]}>
        <View style={{ marginTop: viewport.marginTop, alignItems: 'center' }}>
          <Body
            data={data}
            side={side}
            gender="male"
            scale={viewport.bodyScale}
            border="none"
            colors={[highlightColor, highlightColor]}
            defaultFill="#D8D8D8"
            defaultStroke="#C4C4C4"
            defaultStrokeWidth={0.5}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  heroWrap: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  fill: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  clip: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    alignItems: 'center',
  },
  clipFill: {
    minHeight: 120,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
