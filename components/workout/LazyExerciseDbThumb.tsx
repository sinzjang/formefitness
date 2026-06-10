// 뷰포트 진입 시 로드 — 세션 캐시 있으면 즉시 표시, 없으면 스케줄러 경유
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from '../ui/Icon';
import { colors } from '../../constants/theme';
import { isThumbUiCached } from '../../lib/thumbSessionCache';
import { subscribeThumbLoad } from '../../lib/thumbLoadScheduler';
import { ExerciseDbThumb, type ExerciseDbThumbVariant } from './ExerciseDbThumb';

interface LazyExerciseDbThumbProps {
  loadKey: string;
  eligible: boolean;
  nameEn: string;
  exerciseDbId?: string;
  gifUrl?: string;
  variant?: ExerciseDbThumbVariant;
  width?: number;
  height?: number;
  borderRadius?: number;
}

const LIST_SIZE = { width: 52, height: 52, borderRadius: 8 };

export function LazyExerciseDbThumb({
  loadKey,
  eligible,
  nameEn,
  exerciseDbId,
  gifUrl,
  variant = 'list',
  width = LIST_SIZE.width,
  height = LIST_SIZE.height,
  borderRadius = LIST_SIZE.borderRadius,
}: LazyExerciseDbThumbProps) {
  const [ready, setReady] = useState(() => isThumbUiCached(loadKey));

  useEffect(() => {
    if (isThumbUiCached(loadKey)) {
      setReady(true);
      return;
    }
    if (!eligible) return;

    return subscribeThumbLoad(loadKey, () => setReady(true));
  }, [eligible, loadKey]);

  const showThumb = ready || isThumbUiCached(loadKey);

  if (!showThumb) {
    return (
      <View style={[styles.placeholder, { width, height, borderRadius }]}>
        <Icon name="image" size={Math.min(width, height) * 0.4} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <ExerciseDbThumb
      nameEn={nameEn}
      exerciseDbId={exerciseDbId}
      gifUrl={gifUrl}
      variant={variant}
      width={width}
      height={height}
      borderRadius={borderRadius}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
