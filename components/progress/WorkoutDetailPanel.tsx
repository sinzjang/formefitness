// Progress — Workout Detail 패널 (부위별 breakdown 플레이스홀더)
import { View, Text, StyleSheet } from 'react-native';
import type { Language, MuscleGroup } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { MUSCLES, muscleGroupLabel } from '../../constants/muscles';
import { t } from '../../lib/i18n';
import { formatMonthYear, toLocalDateKey } from '../../lib/dates';
import type { WorkoutDayInfo } from '../../stores/historyStore';
import { MuscleBodyView } from '../workout/MuscleBodyView';

interface WorkoutDetailPanelProps {
  lang: Language;
  selectedDate: Date;
  dayMap: Record<string, WorkoutDayInfo>;
}

export function WorkoutDetailPanel({ lang, selectedDate, dayMap }: WorkoutDetailPanelProps) {
  const dateKey = toLocalDateKey(selectedDate);
  const dayInfo = dayMap[dateKey];
  const muscles = dayInfo?.muscles ?? [];

  const dateLabel =
    lang === 'ko'
      ? `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`
      : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.dateTitle}>{dateLabel}</Text>
        <Text style={styles.dateSub}>{formatMonthYear(selectedDate, lang)}</Text>
      </View>

      {!dayInfo?.workedOut ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('progressNoWorkoutDay', lang)}</Text>
          <Text style={styles.emptyBody}>{t('progressSelectDayHint', lang)}</Text>
        </View>
      ) : (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>{t('progressMuscleBreakdown', lang)}</Text>
            <Text style={styles.summaryHint}>{t('progressDetailComingSoon', lang)}</Text>
          </View>

          <View style={styles.muscleGrid}>
            {MUSCLES.map((muscle) => {
              const active = muscles.includes(muscle.id);
              return (
                <MuscleBreakdownRow
                  key={muscle.id}
                  lang={lang}
                  muscleGroup={muscle.id}
                  active={active}
                />
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

function MuscleBreakdownRow({
  lang,
  muscleGroup,
  active,
}: {
  lang: Language;
  muscleGroup: MuscleGroup;
  active: boolean;
}) {
  const def = MUSCLES.find((m) => m.id === muscleGroup)!;

  return (
    <View style={[styles.muscleRow, !active && styles.muscleRowInactive]}>
      <MuscleBodyView muscleGroup={muscleGroup} size="thumb" empty={!active} />
      <View style={styles.muscleMeta}>
        <Text style={[styles.muscleName, !active && styles.muscleNameInactive]}>
          {muscleGroupLabel(muscleGroup, lang)}
        </Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: active ? '55%' : '0%',
                backgroundColor: def.color,
              },
            ]}
          />
        </View>
        <Text style={styles.muscleStat}>
          {active ? '—' : t('progressNoData', lang)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 16,
    backgroundColor: colors.background,
  },
  dateTitle: {
    ...typography.sectionHeader,
    fontSize: 18,
    textTransform: 'none',
    letterSpacing: 0,
  },
  dateSub: {
    ...typography.caption,
    marginTop: 4,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 24,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    ...typography.listItem,
    marginBottom: 6,
  },
  emptyBody: {
    ...typography.body,
    textAlign: 'center',
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 14,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryHint: {
    ...typography.body,
    fontSize: 13,
  },
  muscleGrid: {
    gap: 8,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 10,
    backgroundColor: colors.background,
  },
  muscleRowInactive: {
    opacity: 0.45,
  },
  muscleMeta: {
    flex: 1,
    gap: 6,
  },
  muscleName: {
    ...typography.listItem,
    fontSize: 14,
  },
  muscleNameInactive: {
    color: colors.textSecondary,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  muscleStat: {
    ...typography.caption,
    fontSize: 11,
  },
});
