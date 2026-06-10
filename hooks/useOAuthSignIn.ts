// 웰컴 화면 OAuth 로그인 훅 — 네이티브 모듈은 버튼 탭 시에만 로드
import { useCallback, useState } from 'react';
import type { OAuthSignInResult } from '../lib/auth/google';

type OAuthProvider = 'google' | 'apple';

export function useOAuthSignIn() {
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(async (provider: OAuthProvider): Promise<OAuthSignInResult> => {
    setLoading(provider);
    setError(null);
    try {
      const result =
        provider === 'google'
          ? await (await import('../lib/auth/google')).signInWithGoogle()
          : await (await import('../lib/auth/apple')).signInWithApple();

      if (!result.ok && !result.cancelled) {
        setError(result.message);
      }
      return result;
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : '로그인 모듈을 불러오지 못했습니다. npx expo run:ios 로 dev build를 다시 만들어 주세요.';
      setError(message);
      return { ok: false, message };
    } finally {
      setLoading(null);
    }
  }, []);

  const signInGoogle = useCallback(() => run('google'), [run]);
  const signInApple = useCallback(() => run('apple'), [run]);

  return {
    loading,
    error,
    clearError,
    signInGoogle,
    signInApple,
    isSigningIn: loading !== null,
  };
}
