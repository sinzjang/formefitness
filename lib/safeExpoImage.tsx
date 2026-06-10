// expo-image 네이티브 모듈 없을 때 RN Image로 폴백 (구버전 dev build 호환)
import type { ComponentType } from 'react';
import {
  Image as RNImage,
  type ImageProps as RNImageProps,
  type ImageResizeMode,
} from 'react-native';

type ContentFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

export type SafeImageProps = {
  source: RNImageProps['source'];
  style?: RNImageProps['style'];
  contentFit?: ContentFit;
  autoplay?: boolean;
  onLoad?: () => void;
  onError?: () => void;
};

let expoImageComponent: ComponentType<SafeImageProps> | null = null;

try {
  // 정적 import는 네이티브 모듈 없을 때 앱 전체가 크래시하므로 require + try/catch
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireNativeModule } = require('expo-modules-core');
  requireNativeModule('ExpoImage');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  expoImageComponent = require('expo-image').Image;
} catch {
  expoImageComponent = null;
}

export const isExpoImageAvailable = expoImageComponent !== null;

function contentFitToResizeMode(fit: ContentFit): ImageResizeMode {
  if (fit === 'contain' || fit === 'scale-down') return 'contain';
  return 'cover';
}

export function SafeImage({
  source,
  style,
  contentFit = 'cover',
  onLoad,
  onError,
}: SafeImageProps) {
  if (expoImageComponent) {
    const ExpoImage = expoImageComponent;
    return (
      <ExpoImage
        source={source}
        style={style}
        contentFit={contentFit}
        onLoad={onLoad}
        onError={onError}
      />
    );
  }

  return (
    <RNImage
      source={source}
      style={style}
      resizeMode={contentFitToResizeMode(contentFit)}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
