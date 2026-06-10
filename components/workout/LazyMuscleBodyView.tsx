// 스크롤 멈춤 후 근육图 — 세션 캐시 있으면 즉시 표시
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import type { MuscleGroup } from '../../types';
import { colors } from '../../constants/theme';
import { isBodyUiCached, markBodyUiCached } from '../../lib/thumbSessionCache';
import { MuscleBodyView } from './MuscleBodyView';

interface LazyMuscleBodyViewProps {
  loadKey: string;
  eligible: boolean;
  scrollIdle: boolean;
  muscleKeys?: string[];
  muscleGroup?: MuscleGroup;
}

const THUMB_BOX = { width: 52, height: 52, borderRadius: 8 };

export function LazyMuscleBodyView({
  loadKey,
  eligible,
  scrollIdle,
  muscleKeys,
  muscleGroup,
}: LazyMuscleBodyViewProps) {
  const [ready, setReady] = useState(() => isBodyUiCached(loadKey));

  useEffect(() => {
    if (isBodyUiCached(loadKey)) {
      setReady(true);
      return;
    }
    if (!eligible || !scrollIdle) return;

    const timer = setTimeout(() => {
      markBodyUiCached(loadKey);
      setReady(true);
    }, 80);
    return () => clearTimeout(timer);
  }, [eligible, scrollIdle, loadKey, muscleKeys, muscleGroup]);

  const showBody = ready || isBodyUiCached(loadKey);

  if (!showBody) {
    return <View style={styles.placeholder} />;
  }

  return <MuscleBodyView muscleKeys={muscleKeys} muscleGroup={muscleGroup} />;
}

const styles = StyleSheet.create({
  placeholder: {
    width: THUMB_BOX.width,
    height: THUMB_BOX.height,
    borderRadius: THUMB_BOX.borderRadius,
    backgroundColor: colors.surface,
  },
});
