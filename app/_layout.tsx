// Forme 루트 레이아웃: Barlow 폰트 로딩 + 스플래시 제어 + Stack 네비게이션
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import {
  useFonts,
  Barlow_300Light,
  Barlow_400Regular,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_900Black_Italic,
} from '@expo-google-fonts/barlow';
import { colors } from '../constants/theme';

// 폰트 로딩 전까지 스플래시 유지
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Barlow_300Light,
    Barlow_400Regular,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Barlow_900Black_Italic,
  });

  useEffect(() => {
    // 폰트 로딩 완료(또는 실패) 시 스플래시 숨김
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!fontsLoaded) return;
    void (async () => {
      try {
        const mod = await import('../lib/applyWorkoutImport');
        if (typeof mod.applyWorkoutImportIfNeeded === 'function') {
          await mod.applyWorkoutImportIfNeeded();
        }
      } catch {
        // CSV import 실패해도 앱은 계속 동작
      }
    })();
  }, [fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="exercise-db-test" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
