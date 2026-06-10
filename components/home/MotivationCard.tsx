// Home — 모티베이션 이미지 + 문구 (좌측 2/3 패널, 랜덤 슬라이드)
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  type ImageSourcePropType,
} from 'react-native';
import { colors, typography, layout } from '../../constants/theme';
import { buildRandomMotivationSlides } from '../../constants/motivation';
import type { Language } from '../../types';

const ROTATE_MS = 7000;
const SLIDE_COUNT = 6;

interface MotivationCardProps {
  lang: Language;
  goalImageUrl?: string;
}

export function MotivationCard({ lang, goalImageUrl }: MotivationCardProps) {
  const slides = useMemo(() => {
    const base = buildRandomMotivationSlides(SLIDE_COUNT).map((s) => ({
      image: s.image as ImageSourcePropType,
      quote: s.quote,
    }));

    if (goalImageUrl) {
      return [
        {
          image: { uri: goalImageUrl } as ImageSourcePropType,
          quote: {
            ko: '나의 목표를 떠올리며 오늘도 한 세트.',
            en: 'Picture your goal. One more set today.',
          },
        },
        ...base,
      ];
    }
    return base;
  }, [goalImageUrl]);

  const [index, setIndex] = useState(0);
  const slide = slides[index % slides.length];

  useEffect(() => {
    setIndex(0);
  }, [slides.length, goalImageUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <View style={styles.card}>
      <Image source={slide.image} style={styles.image} resizeMode="cover" />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <Text style={styles.quote}>{slide.quote[lang]}</Text>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <Pressable key={i} onPress={() => setIndex(i)} hitSlop={6}>
              <View style={[styles.dot, i === index % slides.length && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 280,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 17, 17, 0.42)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 14,
  },
  quote: {
    ...typography.listItem,
    fontSize: 14,
    lineHeight: 20,
    color: colors.background,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: colors.background,
    width: 14,
  },
});
