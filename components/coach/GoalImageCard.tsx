// 목표 이미지 카드 (데일리 인사용)
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';

interface GoalImageCardProps {
  lang: Language;
  imageUrl?: string;
}

export function GoalImageCard({ lang, imageUrl }: GoalImageCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('coachGoalImage', lang)}</Text>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{t('coachGoalPlaceholder', lang)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.caption,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  image: {
    width: '100%',
    height: 140,
  },
  placeholder: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  placeholderText: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
