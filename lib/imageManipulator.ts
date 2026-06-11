// 이미지 크롭 — 네이티브 모듈 없으면 null (dev client 재빌드 필요)
import { Alert } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';

type ImageManipulatorModule = typeof import('expo-image-manipulator');

let manipulatorModule: ImageManipulatorModule | null | undefined;

function getImageManipulatorModule(): ImageManipulatorModule | null {
  if (manipulatorModule !== undefined) return manipulatorModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core');
    requireNativeModule('ExpoImageManipulator');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    manipulatorModule = require('expo-image-manipulator') as ImageManipulatorModule;
  } catch {
    manipulatorModule = null;
  }

  return manipulatorModule;
}

export const isImageManipulatorAvailable = (): boolean =>
  getImageManipulatorModule() !== null;

function showManipulatorUnavailableAlert() {
  const lang = useSettingsStore.getState().language;
  if (lang === 'ko') {
    Alert.alert(
      '크롭 불가',
      '이 기능은 최신 개발 빌드가 필요합니다.\n\nnpx expo run:android\n또는 EAS build 후 다시 설치해 주세요.'
    );
  } else {
    Alert.alert(
      'Crop unavailable',
      'Rebuild the dev client:\nnpx expo run:android\nor install a new EAS build.'
    );
  }
}

export interface ImageCropParams {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** 자유 비율 크롭 — 모듈 없으면 null */
export async function cropImageRect(
  uri: string,
  crop: ImageCropParams,
  options?: { showAlert?: boolean }
): Promise<string | null> {
  const ImageManipulator = getImageManipulatorModule();
  if (!ImageManipulator) {
    if (options?.showAlert !== false) showManipulatorUnavailableAlert();
    return null;
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: Math.round(crop.originX),
          originY: Math.round(crop.originY),
          width: Math.round(crop.width),
          height: Math.round(crop.height),
        },
      },
    ],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );

  return result.uri;
}

/** 선택한 원본 이미지를 앱 캐시의 JPEG로 정규화 — iOS PhotoKit representation 오류 완화 */
export async function normalizeImageToJpeg(
  uri: string,
  options?: { maxWidth?: number; showAlert?: boolean }
): Promise<string | null> {
  const ImageManipulator = getImageManipulatorModule();
  if (!ImageManipulator) {
    if (options?.showAlert) showManipulatorUnavailableAlert();
    return null;
  }

  const actions = options?.maxWidth ? [{ resize: { width: options.maxWidth } }] : [];
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return result.uri;
}

/** URI → JPEG base64 (리사이즈 가능 시 800px, 모듈 없으면 원본) */
export async function imageUriToBase64Jpeg(
  uri: string,
  maxWidth = 800
): Promise<string> {
  const ImageManipulator = getImageManipulatorModule();

  if (ImageManipulator) {
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: maxWidth } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (resized.base64) return resized.base64;
    const targetUri = resized.uri ?? uri;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
    return FileSystem.readAsStringAsync(targetUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

/** @deprecated cropImageRect 사용 */
export async function cropImageSquare(
  uri: string,
  crop: { originX: number; originY: number; size: number },
  options?: { showAlert?: boolean }
): Promise<string | null> {
  return cropImageRect(
    uri,
    { originX: crop.originX, originY: crop.originY, width: crop.size, height: crop.size },
    options
  );
}
