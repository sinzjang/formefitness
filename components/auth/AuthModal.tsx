// 로그인 모달 — Google · Apple · 게스트
import { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, layout, fonts } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { Icon } from '../ui/Icon';
import { ModalSafeArea } from '../ui/ModalSafeArea';
import { useOAuthSignIn } from '../../hooks/useOAuthSignIn';
import { useAuthStore } from '../../stores/authStore';

interface AuthModalProps {
  visible: boolean;
  lang: Language;
  onClose: () => void;
}

export function AuthModal({ visible, lang, onClose }: AuthModalProps) {
  const user = useAuthStore((s) => s.user);
  const { loading, error, signInGoogle, signInApple, clearError, isSigningIn } =
    useOAuthSignIn();

  useEffect(() => {
    if (visible && user) onClose();
  }, [visible, user, onClose]);

  useEffect(() => {
    if (!visible) clearError();
  }, [visible, clearError]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} disabled={isSigningIn}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('authModalTitle', lang)}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.body}>
          <Text style={styles.subtitle}>{t('authModalSubtitle', lang)}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.oauthBtn,
              styles.googleBtn,
              (pressed || isSigningIn) && styles.btnPressed,
              isSigningIn && styles.btnDisabled,
            ]}
            onPress={() => void signInGoogle()}
            disabled={isSigningIn}
          >
            {loading === 'google' ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.googleBtnText}>{t('authGoogle', lang)}</Text>
            )}
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              style={({ pressed }) => [
                styles.oauthBtn,
                styles.appleBtn,
                (pressed || isSigningIn) && styles.btnPressed,
                isSigningIn && styles.btnDisabled,
              ]}
              onPress={() => void signInApple()}
              disabled={isSigningIn}
            >
              {loading === 'apple' ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.appleBtnText}>{t('authApple', lang)}</Text>
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.guestBtn, pressed && styles.btnPressed]}
            onPress={onClose}
            disabled={isSigningIn}
          >
            <Text style={[styles.guestBtnText, isSigningIn && styles.guestDisabled]}>
              {t('authGuest', lang)}
            </Text>
          </Pressable>
        </View>
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.listItem,
    fontSize: 16,
  },
  headerSpacer: {
    width: 24,
  },
  body: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 28,
    gap: 12,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  error: {
    ...typography.caption,
    fontFamily: fonts.regular400,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: 4,
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
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  guestBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  guestDisabled: {
    opacity: 0.5,
  },
});
