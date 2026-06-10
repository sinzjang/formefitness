// Google 네이티브 로그인 → Supabase signInWithIdToken
import { Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from '../supabase';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() ?? '';

let configured = false;

async function ensureConfigured() {
  if (configured) return;
  if (!WEB_CLIENT_ID) {
    throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID가 .env에 없습니다.');
  }
  const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    ...(Platform.OS === 'ios' && IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}),
  });
  configured = true;
}

export type OAuthSignInResult =
  | { ok: true }
  | { ok: false; cancelled?: boolean; message: string };

const NATIVE_MODULE_HINT =
  'Google 로그인 네이티브 모듈이 설치되지 않았습니다. 터미널에서 npx expo run:ios (또는 run:android)로 dev build를 다시 만들어 주세요.';

function isMissingNativeModuleError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e);
  return message.includes('RNGoogleSignin') || message.includes('TurboModuleRegistry');
}

export async function signInWithGoogle(): Promise<OAuthSignInResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase가 설정되지 않았습니다.' };
  }

  const {
    GoogleSignin,
    isErrorWithCode,
    isSuccessResponse,
    statusCodes,
  } = await import('@react-native-google-signin/google-signin');

  try {
    await ensureConfigured();

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      return { ok: false, cancelled: true, message: '로그인이 취소되었습니다.' };
    }

    let idToken = response.data.idToken;
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }
    if (!idToken) {
      return { ok: false, message: 'Google ID 토큰을 받지 못했습니다. Web Client ID를 확인하세요.' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) throw error;

    if (data.user) {
      const { syncProfileAfterOAuth } = await import('./syncProfile');
      await syncProfileAfterOAuth(data.user.id, {
        email: response.data.user.email ?? data.user.email,
        displayName: response.data.user.name ?? undefined,
      });
    }

    return { ok: true };
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) {
        return { ok: false, cancelled: true, message: '로그인이 취소되었습니다.' };
      }
      if (e.code === statusCodes.IN_PROGRESS) {
        return { ok: false, message: '로그인이 이미 진행 중입니다.' };
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { ok: false, message: 'Google Play 서비스를 사용할 수 없습니다.' };
      }
      // DEVELOPER_ERROR (code 10): SHA-1 or package name mismatch in Google Cloud Console
      const code = (e as { code: string | number }).code;
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: `Google 로그인 실패 [code=${code}]: ${msg}\n\nDEVELOPER_ERROR(10)인 경우 Google Cloud Console에 SHA-1 지문이 미등록된 것입니다.` };
    }
    if (isMissingNativeModuleError(e)) {
      return { ok: false, message: NATIVE_MODULE_HINT };
    }
    const message = e instanceof Error ? e.message : 'Google 로그인에 실패했습니다.';
    return { ok: false, message };
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    if (!configured) return;
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // 로그아웃 보조 — 실패해도 무시
  }
}
