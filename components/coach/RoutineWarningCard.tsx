// 루틴 추천 + 피로 경고 카드
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '../ui/Icon';
import type { CoachRecommendedRoutine, Language } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';

interface RoutineWarningCardProps {
  lang: Language;
  routine: CoachRecommendedRoutine;
}

export function RoutineWarningCard({ lang, routine }: RoutineWarningCardProps) {
  if (!routine.routineName) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="barbell" size={16} color={colors.textPrimary} />
        <Text style={styles.title}>{routine.routineName}</Text>
      </View>

      {routine.warnings?.length > 0 && (
        <View style={styles.warnings}>
          {routine.warnings.map((w, i) => (
            <View key={`${w.exercise}-${i}`} style={styles.warningRow}>
              <Text style={styles.exercise}>{w.exercise}</Text>
              <Text style={styles.reason}>{w.reason}</Text>
              <Text style={styles.suggestion}>{w.suggestion}</Text>
              {w.alternative ? (
                <Text style={styles.alt}>
                  {t('coachAlternative', lang)}: {w.alternative}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...typography.listItem,
    fontSize: 14,
  },
  warnings: {
    marginTop: 10,
    gap: 10,
  },
  warningRow: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  exercise: {
    ...typography.listItem,
    fontSize: 13,
  },
  reason: {
    ...typography.body,
    marginTop: 2,
  },
  suggestion: {
    ...typography.body,
    marginTop: 2,
    color: colors.textPrimary,
  },
  alt: {
    ...typography.caption,
    marginTop: 4,
  },
});
