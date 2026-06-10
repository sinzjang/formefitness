// Home — 최근 7일 운동 히스토리 (날짜별)
import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Language, SavedWorkoutSession } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { resolveDisplayExerciseName } from '../../lib/exerciseKo';
import { muscleGroupColorSafe } from '../../lib/workoutHistoryIntegrity';
import { formatSessionTimeRange } from '../../lib/sessionDateTime';
import { SessionTimeEditModal } from '../workout/SessionTimeEditModal';
import {
  formatRecentDayLabel,
  groupSessionsByRecent7Days,
  sessionExerciseSetCount,
  sessionTotalVolume,
} from '../../lib/recentHistory';
import { useHistoryStore } from '../../stores/historyStore';

interface RecentWorkoutHistoryProps {
  lang: Language;
}

export function RecentWorkoutHistory({ lang }: RecentWorkoutHistoryProps) {
  const sessions = useHistoryStore((s) => s.sessions);
  const [editSessionId, setEditSessionId] = useState<string | null>(null);

  const days = useMemo(() => groupSessionsByRecent7Days(sessions), [sessions]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('homeRecentHistory', lang)}</Text>

      <View style={styles.list}>
        {days.map((day) => (
          <DayHistoryCard
            key={day.dateKey}
            lang={lang}
            date={day.date}
            sessions={day.sessions}
            onEditSession={setEditSessionId}
          />
        ))}
      </View>

      <SessionTimeEditModal
        visible={!!editSessionId}
        sessionId={editSessionId}
        lang={lang}
        onClose={() => setEditSessionId(null)}
      />
    </View>
  );
}

function DayHistoryCard({
  lang,
  date,
  sessions,
  onEditSession,
}: {
  lang: Language;
  date: Date;
  sessions: SavedWorkoutSession[];
  onEditSession: (id: string) => void;
}) {
  const label = formatRecentDayLabel(date, lang, {
    today: t('homeToday', lang),
    yesterday: t('homeYesterday', lang),
  });
  const workedOut = sessions.length > 0;
  const totalSets = sessions.reduce((n, s) => n + sessionExerciseSetCount(s), 0);

  return (
    <View style={[styles.dayCard, label.isToday && styles.dayCardToday]}>
      <View style={styles.dayHeader}>
        <View style={styles.dayTitleCol}>
          <Text style={[styles.dayPrimary, label.isToday && styles.dayPrimaryToday]}>
            {label.primary}
          </Text>
          <Text style={styles.daySecondary}>{label.secondary}</Text>
        </View>
        {workedOut ? (
          <View style={styles.dayMeta}>
            <Text style={styles.dayMetaText}>
              {sessions.length}
              {t('homeSessionUnit', lang)} · {totalSets}
              {t('setUnit', lang)}
            </Text>
          </View>
        ) : (
          <Text style={styles.restLabel}>{t('homeRestDay', lang)}</Text>
        )}
      </View>

      {workedOut &&
        sessions.map((session) => (
          <SessionBlock
            key={session.id}
            lang={lang}
            session={session}
            onEdit={() => onEditSession(session.id)}
          />
        ))}
    </View>
  );
}

function SessionBlock({
  lang,
  session,
  onEdit,
}: {
  lang: Language;
  session: SavedWorkoutSession;
  onEdit: () => void;
}) {
  const volume = Math.round(sessionTotalVolume(session));
  const exercises = session.exercises.filter((ex) => ex.sets.some((s) => s.reps > 0));

  return (
    <View style={styles.sessionBlock}>
      <Pressable
        style={({ pressed }) => [styles.timeRow, pressed && styles.timeRowPressed]}
        onPress={onEdit}
        accessibilityLabel={t('sessionTimeTapEdit', lang)}
      >
        <Text style={styles.sessionTime}>{formatSessionTimeRange(session, lang)}</Text>
        <Text style={styles.editHint}>{t('sessionTimeTapEdit', lang)}</Text>
      </Pressable>

      {exercises.map((ex, index) => {
        const doneSets = ex.sets.filter((s) => s.reps > 0).length;
        return (
          <View key={`${session.id}-${index}-${ex.exerciseKey}`} style={styles.exerciseRow}>
            <View style={[styles.muscleDot, { backgroundColor: muscleGroupColorSafe(ex.muscleGroup) }]} />
            <Text style={styles.exerciseName} numberOfLines={1}>
              {resolveDisplayExerciseName(ex.exerciseName, lang)}
            </Text>
            <Text style={styles.exerciseSets}>
              {doneSets}
              {t('setUnit', lang)}
            </Text>
          </View>
        );
      })}
      {volume > 0 && (
        <Text style={styles.sessionVolume}>
          {t('volume', lang)} {volume.toLocaleString()} {t('weightUnit', lang)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    fontSize: 14,
    marginBottom: 10,
  },
  list: {
    gap: 8,
  },
  dayCard: {
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dayCardToday: {
    borderColor: colors.textPrimary,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  dayTitleCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  dayPrimary: {
    ...typography.listItem,
    fontSize: 15,
  },
  dayPrimaryToday: {
    fontFamily: typography.sectionHeader.fontFamily,
  },
  daySecondary: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dayMeta: {
    flexShrink: 0,
  },
  dayMetaText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  restLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sessionBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
    paddingVertical: 2,
  },
  timeRowPressed: {
    opacity: 0.7,
  },
  sessionTime: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  editHint: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  exerciseName: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    fontFamily: typography.listItem.fontFamily,
    fontSize: 13,
  },
  exerciseSets: {
    ...typography.caption,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  sessionVolume: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
