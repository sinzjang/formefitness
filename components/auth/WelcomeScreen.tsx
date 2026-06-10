// 웰컴 / 로딩 화면 — 배경 + 로고 상승 애니메이션 + 로그인 버튼 등장
import { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SafeImage } from '../../lib/safeExpoImage';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, fonts, layout } from '../../constants/theme';

const BODY_BG = require('../../src/imgs/app_esse/Forme_body.jpg');
const LOGO = require('../../src/imgs/app_esse/Forme_Logo_only.png');

// 로고 상승 후 버튼 등장까지 타이밍 (ms)
const LOGO_RISE_DELAY = 700;
const LOGO_RISE_DURATION = 650;
const BUTTONS_DELAY = LOGO_RISE_DELAY + LOGO_RISE_DURATION - 120;
const BUTTONS_DURATION = 520;

interface WelcomeScreenProps {
  onGooglePress?: () => void;
  onApplePress?: () => void;
  onGuestPress?: () => void;
  loadingProvider?: 'google' | 'apple' | null;
  error?: string | null;
}

export function WelcomeScreen({
  onGooglePress,
  onApplePress,
  onGuestPress,
  loadingProvider = null,
  error = null,
}: WelcomeScreenProps) {
  const { width } = useWindowDimensions();
  const logoWidth = Math.min(width * 0.62, 300);

  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(28);
  const buttonsOpacity = useSharedValue(0);
  const buttonsTranslateY = useSharedValue(36);

  useEffect(() => {
    // 로고 페이드인
    logoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    logoTranslateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });

    // 잠시 후 로고를 위로 올림
    logoTranslateY.value = withDelay(
      LOGO_RISE_DELAY,
      withTiming(-52, { duration: LOGO_RISE_DURATION, easing: Easing.inOut(Easing.cubic) })
    );

    // 로그인 버튼 등장
    buttonsOpacity.value = withDelay(
      BUTTONS_DELAY,
      withTiming(1, { duration: BUTTONS_DURATION, easing: Easing.out(Easing.cubic) })
    );
    buttonsTranslateY.value = withDelay(
      BUTTONS_DELAY,
      withTiming(0, { duration: BUTTONS_DURATION, easing: Easing.out(Easing.cubic) })
    );
  }, [buttonsOpacity, buttonsTranslateY, logoOpacity, logoTranslateY]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsTranslateY.value }],
  }));

  const enterApp = () => router.replace('/(tabs)');
  const isBusy = loadingProvider !== null;

  return (
    <View style={styles.root}>
      <SafeImage source={BODY_BG} style={styles.background} contentFit="cover" />
      <View style={styles.scrim} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Animated.View style={[styles.logoWrap, logoStyle]}>
            <SafeImage
              source={LOGO}
              style={{ width: logoWidth, height: logoWidth }}
              contentFit="contain"
            />
          </Animated.View>

          <Animated.View style={[styles.actions, buttonsStyle, { width: width - layout.screenPadding * 2 }]}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.oauthBtn,
                styles.googleBtn,
                (pressed || isBusy) && styles.btnPressed,
                isBusy && styles.btnDisabled,
              ]}
              onPress={onGooglePress ?? enterApp}
              disabled={isBusy}
            >
              {loadingProvider === 'google' ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Text style={styles.googleBtnText}>Google로 계속하기</Text>
              )}
            </Pressable>

            {Platform.OS === 'ios' && (
              <Pressable
                style={({ pressed }) => [
                  styles.oauthBtn,
                  styles.appleBtn,
                  (pressed || isBusy) && styles.btnPressed,
                  isBusy && styles.btnDisabled,
                ]}
                onPress={onApplePress}
                disabled={isBusy || !onApplePress}
              >
                {loadingProvider === 'apple' ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.appleBtnText}>Apple로 계속하기</Text>
                )}
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [styles.guestBtn, pressed && styles.guestPressed]}
              onPress={onGuestPress ?? enterApp}
              disabled={isBusy}
            >
              <Text style={[styles.guestBtnText, isBusy && styles.guestDisabled]}>
                게스트로 시작하기
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.textPrimary,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  actions: {
    gap: 12,
    marginTop: 20,
  },
  oauthBtn: {
    height: 52,
    borderRadius: layout.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: layout.borderWidth,
  },
  googleBtn: {
    backgroundColor: colors.background,
    borderColor: colors.border,
  },
  googleBtnText: {
    fontFamily: fonts.semibold600,
    fontSize: 15,
    color: colors.textPrimary,
  },
  appleBtn: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  appleBtnText: {
    fontFamily: fonts.semibold600,
    fontSize: 15,
    color: colors.background,
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  errorText: {
    fontFamily: fonts.regular400,
    fontSize: 13,
    color: '#FFE4E4',
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  guestPressed: {
    opacity: 0.7,
  },
  guestBtnText: {
    fontFamily: fonts.regular400,
    fontSize: 14,
    color: colors.background,
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  guestDisabled: {
    opacity: 0.5,
  },
});
