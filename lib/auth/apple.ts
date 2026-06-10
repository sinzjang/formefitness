// Apple 네이티브 로그인 → Supabase signInWithIdToken (iOS 전용)
import { Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from '../supabase';
import type { OAuthSignInResult } from './google';

function buildAppleDisplayName(
  fullName: { givenName: string | null; familyName: string | null } | null
): string | undefined {
  if (!fullName) return undefined;
  const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
  const displayName = parts.join(' ').trim();
  return displayName || undefined;
}

export async function signInWithApple(): Promise<OAuthSignInResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, message: 'Apple 로그인은 iOS에서만 사용할 수 있습니다.' };
  }
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase가 설정되지 않았습니다.' };
  }

  // 네이티브 모듈 — dev build 재빌드 전까지 앱 시작 시 로드하지 않음
  const AppleAuthentication = await import('expo-apple-authentication');
  const Crypto = await import('expo-crypto');

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    return { ok: false, message: '이 기기에서 Apple 로그인을 사용할 수 없습니다.' };
  }

  try {
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { ok: false, message: 'Apple ID 토큰을 받지 못했습니다.' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });
    if (error) throw error;

    if (data.user) {
      const { syncProfileAfterOAuth } = await import('./syncProfile');
      await syncProfileAfterOAuth(data.user.id, {
        email: credential.email ?? data.user.email,
        displayName: buildAppleDisplayName(credential.fullName),
      });
    }

    return { ok: true };
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code: string }).code === 'ERR_REQUEST_CANCELED'
    ) {
      return { ok: false, cancelled: true, message: '로그인이 취소되었습니다.' };
    }
    const message = e instanceof Error ? e.message : 'Apple 로그인에 실패했습니다.';
    return { ok: false, message };
  }
}
