// 차트 응답 플레이스홀더 (Phase 5 전까지 요약 표시)
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CoachChartData, Language } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';

interface ChartPlaceholderCardProps {
  lang: Language;
  chart: CoachChartData;
}

export function ChartPlaceholderCard({ lang, chart }: ChartPlaceholderCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="stats-chart-outline" size={16} color={colors.textPrimary} />
        <Text style={styles.title}>{chart.title}</Text>
      </View>
      <Text style={styles.meta}>
        {chart.type.toUpperCase()} · {t('coachChartSoon', lang)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    padding: 12,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...typography.listItem,
    fontSize: 14,
    flex: 1,
  },
  meta: {
    ...typography.caption,
    marginTop: 6,
  },
});
