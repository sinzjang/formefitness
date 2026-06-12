import type { ExpoConfig } from 'expo/config';

/** iOS Google Sign-In URL scheme (REVERSED_CLIENT_ID) */
function googleIosUrlScheme(iosClientId: string): string {
  const prefix = iosClientId.replace('.apps.googleusercontent.com', '').trim();
  return prefix ? `com.googleusercontent.apps.${prefix}` : 'com.googleusercontent.apps.placeholder';
}

const IS_DEV =
  process.env.APP_VARIANT === 'development' ||
  process.env.EAS_BUILD_PROFILE === 'development';
const SPLASH_LOGO = './src/imgs/app_esse/Forme_Logo_only.png';
const APP_ICON = IS_DEV ? './assets/splash-icon_dev.png' : './assets/splash-icon.png';

export default (): ExpoConfig => ({
  name: IS_DEV ? 'Forme Dev' : 'Forme Fitness',
  slug: 'forme-fitness',
  version: '1.0.0',
  scheme: 'formefitness',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  icon: APP_ICON,
  splash: {
    image: SPLASH_LOGO,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
  },
  ios: {
    bundleIdentifier: 'com.forme.fitness',
    supportsTablet: true,
    usesAppleSignIn: true,
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: true,
      },
      // Goal 위저드 · 프로필 · 피드 사진 접근 (TCC 크래시 방지)
      NSPhotoLibraryUsageDescription:
        'Formé가 Goal 설정, 프로필, 피드에 사진을 선택하기 위해 사진 라이브러리에 접근합니다.',
      NSCameraUsageDescription:
        'Formé가 Goal 설정과 프로필 사진을 촬영하기 위해 카메라에 접근합니다.',
      NSMicrophoneUsageDescription:
        'Formé가 자세 확인 영상을 촬영할 때 오디오 권한이 필요할 수 있습니다.',
      // 표준 Apple 암호화만 사용 — App Store 수출 규정 준수 선언
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.forme.fitness',
    permissions: ['com.android.vending.BILLING'],
    adaptiveIcon: {
      foregroundImage: APP_ICON,
      backgroundColor: '#FFFFFF',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-apple-authentication',
    'expo-video',
    [
      'expo-build-properties',
      {
        ios: {
          // AppCheckCore(GoogleSignIn 의존) Swift pod의 modular headers 활성화
          extraPods: [
            { name: 'GoogleUtilities', modular_headers: true },
            { name: 'RecaptchaInterop', modular_headers: true },
          ],
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: SPLASH_LOGO,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: googleIosUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? ''),
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Formé가 Goal 설정, 프로필, 피드에 사진을 선택하기 위해 사진 라이브러리에 접근합니다.',
        cameraPermission:
          'Formé가 Goal 설정과 프로필 사진을 촬영하기 위해 카메라에 접근합니다.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
    eas: {
      projectId: '8cb3f234-f6d9-4917-a95f-346e83c4d5c4',
    },
  },
  owner: 'sinzjang',
});
