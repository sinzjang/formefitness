// Progress Goal 설정 배너 — 왼쪽 풀 이미지 + 스포티 그레이
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, layout } from '../../constants/theme';
import { getTierName } from '../../constants/tiers';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { useGoalStore } from '../../stores/goalStore';
import { Icon } from '../ui/Icon';

/** 배너 스포티 그레이 팔레트 */
const BANNER = {
  bg: '#3A4048',
  imageBg: '#2A2E34',
  text: '#F5F5F5',
  sub: '#B8BEC6',
  border: '#4A5159',
} as const;

const IMAGE_WIDTH = 108;
const BANNER_MIN_HEIGHT = 96;

interface GoalBannerProps {
  lang: Language;
  onPress: () => void;
}

export function GoalBanner({ lang, onPress }: GoalBannerProps) {
  const isSetup = useGoalStore((s) => s.isSetup);
  const wizardAnswers = useGoalStore((s) => s.wizardAnswers);
  const goalImageUri = useGoalStore((s) => s.goalImageUri);
  const tier = wizardAnswers?.targetTier;

  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      onPress={onPress}
    >
      <View style={styles.imageCol}>
        {goalImageUri ? (
          <Image source={{ uri: goalImageUri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="check-circle" size={28} color={colors.accent} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.textBlock}>
          {isSetup && tier ? (
            <>
              <Text style={styles.eyebrow}>{t('goalBannerEyebrow', lang)}</Text>
              <Text style={styles.headline}>{getTierName(tier, lang)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.headline}>{t('goalBannerEmptyTitle', lang)}</Text>
              <Text style={styles.sub}>{t('goalBannerEmptySub', lang)}</Text>
            </>
          )}
        </View>
        <Icon name="chevron-forward" size={20} color={BANNER.sub} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    minHeight: BANNER_MIN_HEIGHT,
    borderRadius: layout.cardRadius,
    borderWidth: layout.borderWidth,
    borderColor: BANNER.border,
    backgroundColor: BANNER.bg,
    overflow: 'hidden',
  },
  bannerPressed: {
    opacity: 0.94,
  },
  imageCol: {
    width: IMAGE_WIDTH,
    minHeight: BANNER_MIN_HEIGHT,
    alignSelf: 'stretch',
    backgroundColor: BANNER.imageBg,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imagePlaceholder: {
    flex: 1,
    minHeight: BANNER_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BANNER.imageBg,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: fonts.bold700,
    fontSize: 10,
    letterSpacing: 2.8,
    textTransform: 'uppercase',
    color: colors.accent,
    marginBottom: 4,
  },
  headline: {
    fontFamily: fonts.black900Italic,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.4,
    color: BANNER.text,
  },
  sub: {
    fontFamily: fonts.light300,
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.4,
    color: BANNER.sub,
    marginTop: 6,
  },
});
