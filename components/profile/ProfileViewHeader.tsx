// 프로필 상단 — 아바타 + (이름 위 Tier·Login) + 닉네임 + 이메일
import { useEffect } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { colors, typography } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { Icon } from '../ui/Icon';
import { useProfilePrefsStore } from '../../stores/profilePrefsStore';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

interface ProfileViewHeaderProps {
  lang: Language;
  onLoginPress: () => void;
}

export function ProfileViewHeader({ lang, onLoginPress }: ProfileViewHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const planId = useSubscriptionStore((s) => s.planId);
  const isPro = useSubscriptionStore((s) => s.isPro());

  const avatarUri = useProfilePrefsStore((s) => s.avatarUri);
  const nickname = useProfilePrefsStore((s) => s.nickname);
  const hideEmail = useProfilePrefsStore((s) => s.hideEmail);
  const setNickname = useProfilePrefsStore((s) => s.setNickname);

  useEffect(() => {
    if (!nickname && profile?.displayName) {
      setNickname(profile.displayName);
    }
  }, [profile?.displayName, nickname, setNickname]);

  const displayName =
    nickname.trim() ||
    profile?.displayName?.trim() ||
    t('profileNicknamePlaceholder', lang);

  const email = profile?.email ?? user?.email ?? '';
  const emailLine =
    !hideEmail && email ? email : hideEmail ? t('profileHidden', lang) : '—';

  const planLabel =
    isPro || planId === 'pro' ? t('profilePlanPro', lang) : t('profilePlanFree', lang);

  const handleAuthPress = () => {
    if (user) {
      void signOut();
    } else {
      onLoginPress();
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.profileRow}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Icon name="person" size={40} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.nameCol}>
          <View style={styles.tierRow}>
            <View style={styles.tierLeft}>
              <Text style={styles.tierLabel}>{t('profileTier', lang)}</Text>
              <View style={[styles.planChip, isPro && styles.planChipPro]}>
                <Text style={[styles.planChipText, isPro && styles.planChipTextPro]}>
                  {planLabel}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => pressed && styles.authLinkPressed}
              onPress={handleAuthPress}
              hitSlop={8}
            >
              <Text style={styles.authLink}>
                {user ? t('profileSignOut', lang) : t('profileLogin', lang)}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.nickname}>{displayName}</Text>
          <Text
            style={[styles.email, (!email || hideEmail) && styles.emailMuted]}
            numberOfLines={1}
          >
            {emailLine}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
    paddingTop: 2,
    gap: 4,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  tierLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  tierLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  planChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  planChipPro: {
    borderColor: colors.accent,
    backgroundColor: colors.textPrimary,
  },
  planChipText: {
    ...typography.listItem,
    fontSize: 12,
    color: colors.textPrimary,
  },
  planChipTextPro: {
    color: colors.background,
  },
  authLink: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
  authLinkPressed: {
    opacity: 0.6,
  },
  nickname: {
    ...typography.listItem,
    fontSize: 22,
    color: colors.textPrimary,
  },
  email: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emailMuted: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
