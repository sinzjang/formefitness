// Home Week 카드 하단 — 3×3 그리드 대시보드
import { View, StyleSheet } from 'react-native';
import type { Language } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { MotivationCard } from './MotivationCard';
import { BodyStatusCard } from './BodyStatusCard';
import { BodyWeightCard } from './BodyWeightCard';

interface HomeDashboardGridProps {
  lang: Language;
}

export function HomeDashboardGrid({ lang }: HomeDashboardGridProps) {
  const goalImageUrl = useAuthStore((s) => s.profile?.goalImageUrl);

  return (
    <View style={styles.grid}>
      <View style={styles.leftCol}>
        <MotivationCard lang={lang} goalImageUrl={goalImageUrl} />
      </View>
      <View style={styles.rightCol}>
        <BodyStatusCard lang={lang} />
        <BodyWeightCard lang={lang} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    minHeight: 280,
  },
  leftCol: {
    flex: 2,
    minWidth: 0,
  },
  rightCol: {
    flex: 1,
    minWidth: 0,
    minHeight: 280,
    gap: 8,
  },
});
