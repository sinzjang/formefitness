// 운동 기록(History) 바텀 시트
// - 오늘 세트: 현재 세션 세트별 막대그래프
// - 세션 추이: 저장된 과거 세션별 최고 e1RM(또는 횟수) 추이
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import type { Language, WorkoutExercise } from '../../types';
import { colors, typography, layout, fonts } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { getExerciseKey } from '../../lib/exerciseKey';
import { setLoad, setVolume, epley1RM } from '../../lib/strength';
import { summarizeSets } from '../../lib/sessionStats';
import { useLanguage } from '../../stores/settingsStore';
import { resolveDisplayExerciseName } from '../../lib/exerciseKo';
import { useHistoryStore } from '../../stores/historyStore';

const CHART_H = 100;
const MAX_TREND = 8;

interface HistorySheetProps {
  visible: boolean;
  exercise: WorkoutExercise;
  onClose: () => void;
}

// ISO 날짜 → M/D
const shortDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

function HistorySheetContent({ exercise, onClose }: Omit<HistorySheetProps, 'visible'>) {
  const lang = useLanguage();
  const insets = useSafeAreaInsets();
  const type = exercise.resistanceType;
  const exerciseKey = getExerciseKey(exercise.exerciseName, exercise.customId);
  const sessions = useHistoryStore((s) => s.sessions);
  const pastSessions = useMemo(
    () => useHistoryStore.getState().getExerciseHistory(exerciseKey),
    [sessions, exerciseKey]
  );

  // 오늘 세트 (횟수>0)
  const todayRows = exercise.sets
    .filter((s) => s.reps > 0)
    .map((s) => {
      const load = setLoad(s, type);
      return {
        set: s.setNumber,
        reps: s.reps,
        load,
        e1rm: epley1RM(load, s.reps),
        volume: setVolume(load, s.reps),
      };
    });

  const todayStats = summarizeSets(exercise.sets, type);
  const hasLoad = todayStats.hasLoad || pastSessions.some((p) => p.hasLoad);
  const metricLabel = hasLoad ? t('est1RM', lang) : t('repsUnit', lang);

  const todayMetric = (r: (typeof todayRows)[number]) => (hasLoad ? r.e1rm : r.reps);
  const todayMax = Math.max(...todayRows.map(todayMetric), 1);

  // 과거 세션 추이 (최근 N개)
  const trend = pastSessions.slice(-MAX_TREND);
  const trendMetric = (p: (typeof trend)[number]) => (p.hasLoad ? p.bestE1rm : p.bestReps);
  const trendMax = Math.max(...trend.map(trendMetric), 1);

  const hasToday = todayRows.length > 0;
  const hasTrend = trend.length > 0;

  return (
    <Pressable style={styles.overlay} onPress={onClose}>
      <Pressable
        style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
        onPress={() => {}}
      >
          <View style={styles.handle} />

          <Text style={styles.title}>{resolveDisplayExerciseName(exercise.exerciseName, lang)}</Text>
          <Text style={styles.subtitle}>
            {t('history', lang)} · {metricLabel}
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {!hasToday && !hasTrend ? (
              <Text style={styles.empty}>{t('historyEmpty', lang)}</Text>
            ) : (
              <>
                {/* 오늘 세트 */}
                {hasToday && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('todaySession', lang)}</Text>
                    <BarChart
                      items={todayRows.map((r) => ({
                        key: String(r.set),
                        value: todayMetric(r),
                        label: String(r.set),
                      }))}
                      maxValue={todayMax}
                    />
                    <SummaryRow
                      lang={lang}
                      best={hasLoad ? todayStats.bestE1rm : todayStats.bestReps}
                      volume={todayStats.totalVolume}
                      reps={todayStats.totalReps}
                      hasLoad={hasLoad}
                    />
                  </View>
                )}

                {/* 세션 추이 */}
                {hasTrend && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('sessionTrend', lang)}</Text>
                    <BarChart
                      items={trend.map((p) => ({
                        key: p.sessionId,
                        value: trendMetric(p),
                        label: shortDate(p.date),
                      }))}
                      maxValue={trendMax}
                      muted
                    />
                  </View>
                )}

                {!hasTrend && hasToday && (
                  <Text style={styles.note}>{t('noPastSessions', lang)}</Text>
                )}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
  );
}

export function HistorySheet({ visible, exercise, onClose }: HistorySheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaProvider>
        <HistorySheetContent exercise={exercise} onClose={onClose} />
      </SafeAreaProvider>
    </Modal>
  );
}

// 막대그래프 (재사용)
function BarChart({
  items,
  maxValue,
  muted,
}: {
  items: { key: string; value: number; label: string }[];
  maxValue: number;
  muted?: boolean;
}) {
  return (
    <View style={styles.chart}>
      {items.map((item) => {
        const h = Math.max(4, (item.value / maxValue) * CHART_H);
        return (
          <View key={item.key} style={styles.barCol}>
            <Text style={styles.barValue}>{item.value}</Text>
            <View
              style={[
                styles.bar,
                { height: h },
                muted && styles.barMuted,
              ]}
            />
            <Text style={styles.barX} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// 요약 3칸
function SummaryRow({
  lang,
  best,
  volume,
  reps,
  hasLoad,
}: {
  lang: Language;
  best: number;
  volume: number;
  reps: number;
  hasLoad: boolean;
}) {
  return (
    <View style={styles.summary}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{best}</Text>
        <Text style={styles.summaryLabel}>
          {hasLoad ? t('bestSet', lang) : t('totalReps', lang)}
        </Text>
      </View>
      {hasLoad && (
        <>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{volume}</Text>
            <Text style={styles.summaryLabel}>{t('totalVolume', lang)}</Text>
          </View>
        </>
      )}
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryValue}>{reps}</Text>
        <Text style={styles.summaryLabel}>{t('totalReps', lang)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 10,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  title: {
    ...typography.sectionHeader,
    fontSize: 20,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 420,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textMuted,
    marginBottom: 8,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: 32,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: CHART_H + 36,
    paddingTop: 4,
  },
  barCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bar: {
    width: 22,
    borderRadius: 6,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  barMuted: {
    backgroundColor: colors.textPrimary,
  },
  barValue: {
    ...typography.caption,
    color: colors.textPrimary,
    fontSize: 10,
  },
  barX: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    fontSize: 10,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: fonts.bold700,
    fontSize: 16,
    color: colors.textPrimary,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    fontSize: 10,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: colors.border,
  },
  note: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
