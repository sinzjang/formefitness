// 갤러리에서 이미지 1장 선택 (네이티브 모듈 없으면 안내 후 null)
import { Alert, Platform } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';

type ImagePickerModule = typeof import('expo-image-picker');

export interface PickedImage {
  uri: string;
  width?: number;
  height?: number;
}

let imagePickerModule: ImagePickerModule | null | undefined;

function getImagePickerModule(): ImagePickerModule | null {
  if (imagePickerModule !== undefined) return imagePickerModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo-modules-core');
    requireNativeModule('ExponentImagePicker');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    imagePickerModule = require('expo-image-picker') as ImagePickerModule;
  } catch {
    imagePickerModule = null;
  }

  return imagePickerModule;
}

export const isImagePickerAvailable = (): boolean => getImagePickerModule() !== null;

function showPickerUnavailableAlert() {
  const lang = useSettingsStore.getState().language;
  if (lang === 'ko') {
    Alert.alert(
      '사진 선택 불가',
      '이 기능은 최신 개발 빌드가 필요합니다.\n\nnpx expo run:ios\n또는 npx expo run:android 로 앱을 다시 빌드해 주세요.'
    );
  } else {
    Alert.alert(
      'Photo picker unavailable',
      'Rebuild the dev client:\nnpx expo run:ios\nor npx expo run:android'
    );
  }
}

export async function pickImageFromLibrary(options?: {
  /** false 권장 — 앱 내 ImageCropModal 사용 */
  allowsEditing?: boolean;
}): Promise<PickedImage | null> {
  const ImagePicker = getImagePickerModule();
  if (!ImagePicker) {
    showPickerUnavailableAlert();
    return null;
  }

  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const lang = useSettingsStore.getState().language;
      Alert.alert(
        lang === 'ko' ? '권한 필요' : 'Permission',
        lang === 'ko' ? '사진 라이브러리 접근 권한이 필요합니다.' : 'Photo library access is required.'
      );
      return null;
    }
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: options?.allowsEditing ?? false,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  };
}

/** uri만 필요할 때 */
export async function pickImageUriFromLibrary(): Promise<string | null> {
  const picked = await pickImageFromLibrary();
  return picked?.uri ?? null;
}

/** 카메라 촬영 */
export async function pickImageFromCamera(): Promise<PickedImage | null> {
  const ImagePicker = getImagePickerModule();
  if (!ImagePicker) {
    showPickerUnavailableAlert();
    return null;
  }

  if (Platform.OS !== 'web') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      const lang = useSettingsStore.getState().language;
      Alert.alert(
        lang === 'ko' ? '권한 필요' : 'Permission',
        lang === 'ko' ? '카메라 접근 권한이 필요합니다.' : 'Camera access is required.'
      );
      return null;
    }
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
  });

  if (result.canceled || !result.assets[0]?.uri) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}
