// 앱 진입 — auth 확인 후 웰컴 또는 탭으로 이동
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { WelcomeScreen } from '../components/auth/WelcomeScreen';
import { useOAuthSignIn } from '../hooks/useOAuthSignIn';
import { useAuthStore } from '../stores/authStore';
import { colors } from '../constants/theme';

export default function WelcomeRoute() {
  const isReady = useAuthStore((s) => s.isReady);
  const session = useAuthStore((s) => s.session);
  const { loading, error, signInGoogle, signInApple } = useOAuthSignIn();

  useEffect(() => {
    if (!isReady) return;
    if (session) {
      router.replace('/(tabs)');
    }
  }, [isReady, session]);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  if (session) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return (
    <WelcomeScreen
      onGooglePress={() => void signInGoogle()}
      onApplePress={() => void signInApple()}
      onGuestPress={() => router.replace('/(tabs)')}
      loadingProvider={loading}
      error={error}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
