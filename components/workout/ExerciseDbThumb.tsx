// Forme 운동명 → ExerciseDB 미디어 (리스트 썸네일 / 모달 GIF)
import { useEffect, useState } from 'react';
import type { ViewStyle } from 'react-native';
import {
  resolveExerciseGifMedia,
  resolveExerciseThumbnail,
} from '../../lib/exerciseDbIdCache';
import { getCatalogExerciseDbId } from '../../constants/exerciseDbCatalogIds';
import { ExerciseDbMedia } from './ExerciseDbGif';
import type { RapidApiGifResolution } from '../../types/exerciseDb';

export type ExerciseDbThumbVariant = 'list' | 'hero';

interface ExerciseDbThumbProps {
  nameEn: string;
  exerciseDbId?: string;
  /** 모달 GIF — GitHub CDN 직접 URL (우선) */
  gifUrl?: string;
  variant?: ExerciseDbThumbVariant;
  width?: number;
  height?: number;
  borderRadius?: number;
  rapidResolution?: RapidApiGifResolution;
  style?: ViewStyle;
}

const VARIANT_DEFAULTS: Record<
  ExerciseDbThumbVariant,
  { width: number; height: number; resolution: RapidApiGifResolution; animated: boolean; contentFit: 'cover' | 'contain' }
> = {
  list: { width: 52, height: 52, resolution: 180, animated: false, contentFit: 'cover' as const },
  hero: { width: 280, height: 280, resolution: 360, animated: true, contentFit: 'contain' as const },
};

export function ExerciseDbThumb({
  nameEn,
  exerciseDbId,
  gifUrl,
  variant = 'list',
  width,
  height,
  borderRadius = 8,
  rapidResolution,
  style,
}: ExerciseDbThumbProps) {
  const defaults = VARIANT_DEFAULTS[variant];
  const catalogId = exerciseDbId ?? getCatalogExerciseDbId(nameEn);
  const [resolvedId, setResolvedId] = useState<string | undefined>(catalogId);
  const [resolvedGifUrl, setResolvedGifUrl] = useState<string | undefined>(gifUrl);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    if (catalogId) setResolvedId(catalogId);
    if (gifUrl) setResolvedGifUrl(gifUrl);

    if (variant === 'list') {
      // 리스트: gifUrl만 있으면 즉시 정지 썸네일 표시
      if (gifUrl) return;

      resolveExerciseThumbnail(nameEn, exerciseDbId)
        .then((media) => {
          if (cancelled || !media) return;
          if (media.thumbnailUrl) setThumbnailUrl(media.thumbnailUrl);
          if (media.exerciseId) setResolvedId(media.exerciseId);
        })
        .catch(() => {});
      return;
    }

    // 모달: gifUrl + exerciseDbId 즉시 사용 (추가 API 호출 최소화)
    if (catalogId && gifUrl) return;

    if (!gifUrl) {
      resolveExerciseGifMedia(nameEn, exerciseDbId)
        .then((media) => {
          if (cancelled || !media) return;
          if (media.exerciseId) setResolvedId(media.exerciseId);
          if (media.thumbnailUrl) setResolvedGifUrl((prev) => prev ?? media.thumbnailUrl);
        })
        .catch(() => {});
    }

    resolveExerciseThumbnail(nameEn, exerciseDbId)
      .then((media) => {
        if (!cancelled && media?.thumbnailUrl) setThumbnailUrl(media.thumbnailUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [nameEn, exerciseDbId, gifUrl, catalogId, variant]);

  return (
    <ExerciseDbMedia
      exerciseId={resolvedId}
      gifUrl={resolvedGifUrl}
      thumbnailUrl={thumbnailUrl}
      width={width ?? defaults.width}
      height={height ?? defaults.height}
      borderRadius={borderRadius}
      rapidResolution={rapidResolution ?? defaults.resolution}
      animated={defaults.animated}
      contentFit={defaults.contentFit}
      style={style}
    />
  );
}
