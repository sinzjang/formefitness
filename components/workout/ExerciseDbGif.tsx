// ExerciseDB 미디어 — 리스트: 정지 썸네일 / 모달: GIF 재생
import { useMemo, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Image as RNImage,
  type ViewStyle,
  type ImageStyle,
  type ImageResizeMode,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { getRapidApiGifUrl } from '../../lib/exerciseDb';
import type { RapidApiGifResolution } from '../../types/exerciseDb';

interface ExerciseDbMediaProps {
  thumbnailUrl?: string;
  gifUrl?: string;
  exerciseId?: string;
  rapidResolution?: RapidApiGifResolution;
  /** false = 리스트 정지, true = 모달 재생 */
  animated?: boolean;
  contentFit?: 'cover' | 'contain';
  width?: number;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export function ExerciseDbMedia({
  thumbnailUrl,
  gifUrl,
  exerciseId,
  rapidResolution = 180,
  animated = true,
  contentFit,
  width = 52,
  height = 52,
  style,
  borderRadius = 8,
}: ExerciseDbMediaProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [useRnFallback, setUseRnFallback] = useState(false);
  const [useGifFallback, setUseGifFallback] = useState(false);

  const thumb = thumbnailUrl ?? gifUrl;

  const { primaryUri, fallbackUri } = useMemo(() => {
    const rapidUri =
      exerciseId ? getRapidApiGifUrl(exerciseId, animated ? rapidResolution : 180) : null;

    if (animated) {
      // 모달: GitHub GIF 재생
      return {
        primaryUri: gifUrl ?? rapidUri ?? thumb ?? null,
        fallbackUri: rapidUri && gifUrl && rapidUri !== gifUrl ? rapidUri : null,
      };
    }

    // 리스트: gifUrl 첫 프레임 정지 (expo-image autoplay=false)
    return {
      primaryUri: gifUrl ?? rapidUri ?? thumb ?? null,
      fallbackUri: rapidUri && gifUrl && rapidUri !== gifUrl ? rapidUri : null,
    };
  }, [animated, exerciseId, rapidResolution, gifUrl, thumb]);

  const uri = useGifFallback && fallbackUri ? fallbackUri : primaryUri;

  const fit = contentFit ?? (animated ? 'contain' : 'cover');
  const imageStyle: ImageStyle = { width, height, borderRadius };

  if (!uri || failed) {
    return (
      <View style={[styles.box, { width, height, borderRadius }, style, styles.fallback]}>
        <Ionicons name="image-outline" size={Math.min(width, height) * 0.45} color={colors.textMuted} />
      </View>
    );
  }

  const handleLoad = () => setLoading(false);

  const handleError = () => {
    if (!useGifFallback && fallbackUri) {
      setUseGifFallback(true);
      setLoading(true);
      return;
    }
    if (!useRnFallback) {
      setUseRnFallback(true);
      setLoading(true);
      return;
    }
    setLoading(false);
    setFailed(true);
  };

  return (
    <View style={[styles.box, { width, height, borderRadius }, style]}>
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      )}
      {useRnFallback ? (
        <RNImage
          key={uri}
          source={{ uri }}
          style={imageStyle}
          resizeMode={fit === 'contain' ? 'contain' : 'cover'}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        <ExpoImage
          key={uri}
          source={{ uri }}
          style={imageStyle}
          contentFit={fit}
          autoplay={animated}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </View>
  );
}

export function ExerciseDbGif(
  props: Omit<ExerciseDbMediaProps, 'animated' | 'thumbnailUrl'> & {
    animated?: boolean;
    gifUrl?: string;
  }
) {
  return (
    <ExerciseDbMedia
      {...props}
      thumbnailUrl={props.gifUrl}
      animated={props.animated ?? true}
    />
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
