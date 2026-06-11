// 프로필 상단 — 아바타 + 소셜 카운트 + 이름·Tier·구독 + 소개
import { useEffect } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { colors, typography } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { Icon } from '../ui/Icon';
import { useProfilePrefsStore } from '../../stores/profilePrefsStore';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { planDisplayName } from '../../lib/planIds';

interface ProfileViewHeaderProps {
  lang: Language;
  onLoginPress: () => void;
}

export function ProfileViewHeader({ lang, onLoginPress }: ProfileViewHeaderProps) {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const planId = useSubscriptionStore((s) => s.planId);
  const isPrime = useSubscriptionStore((s) => s.isPrime());

  const avatarUri = useProfilePrefsStore((s) => s.avatarUri);
  const nickname = useProfilePrefsStore((s) => s.nickname);
  const bio = useProfilePrefsStore((s) => s.bio);
  const followerCount = useProfilePrefsStore((s) => s.followerCount);
  const followingCount = useProfilePrefsStore((s) => s.followingCount);
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

  const bioLine = bio?.trim() || t('profileBioPlaceholder', lang);

  const planLabel = planDisplayName(planId);

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
          <View style={styles.statsRow}>
            <Stat value={followerCount ?? 0} label={t('profileFollowers', lang)} />
            <Stat value={followingCount ?? 0} label={t('profileFollowing', lang)} />
          </View>

          <View style={styles.identityRow}>
            <View style={styles.identityMain}>
              <Text style={styles.displayName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.tierLabel}>{t('profileTier', lang)}</Text>
              <View style={[styles.planChip, isPrime && styles.planChipPro]}>
                <Text style={[styles.planChipText, isPrime && styles.planChipTextPro]}>
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

          <Text
            style={[styles.bio, !bio?.trim() && styles.bioMuted]}
            numberOfLines={2}
          >
            {bioLine}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 6,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    ...typography.listItem,
    fontSize: 16,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textMuted,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  identityMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  displayName: {
    ...typography.listItem,
    flexShrink: 1,
    maxWidth: 120,
    fontSize: 18,
    color: colors.textPrimary,
  },
  tierLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0,
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
  bio: {
    ...typography.body,
    color: colors.textSecondary,
  },
  bioMuted: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
