// 위클리 캘린더: 이번 주 7일 + 운동한 날 색상/근육 도트
import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Language, MuscleGroup } from '../../types';
import { colors, muscleColors, typography, layout } from '../../constants/theme';
import { getCurrentWeekDays, toLocalDateKey, isSameDay } from '../../lib/dates';
import { useHistoryStore, type WorkoutDayInfo } from '../../stores/historyStore';

// 요일 약어 (월~일)
const WEEKDAY_LABELS: Record<Language, string[]> = {
  ko: ['월', '화', '수', '목', '금', '토', '일'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};

interface WeeklyCalendarProps {
  lang: Language;
  /** strip=상단 넓은 바, compact=카드 안쪽 미니 */
  variant?: 'strip' | 'compact';
  /** 오늘 세션 진행 중 */
  inProgress?: boolean;
  /** 진행 중 세션의 근육 그룹 (오늘 도트용) */
  inProgressMuscles?: MuscleGroup[];
}

export function WeeklyCalendar({
  lang,
  variant = 'strip',
  inProgress,
  inProgressMuscles = [],
}: WeeklyCalendarProps) {
  const compact = variant === 'compact';
  const sessions = useHistoryStore((s) => s.sessions);
  const today = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => getCurrentWeekDays(today), [today]);

  const dayMap = useMemo(() => useHistoryStore.getState().getWorkoutDayMap(), [sessions]);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {weekDays.map((date, index) => {
        const key = toLocalDateKey(date);
        const saved = dayMap[key] ?? { workedOut: false, muscles: [] };
        const isToday = isSameDay(date, today);
        const isActiveToday = isToday && inProgress;

        // 저장된 기록 + 오늘 진행 중 근육 병합
        const muscles = isToday
          ? ([...new Set([...saved.muscles, ...inProgressMuscles])] as MuscleGroup[])
          : saved.muscles;
        const workedOut = saved.workedOut || (isActiveToday && muscles.length > 0);

        return (
          <View key={key} style={[styles.dayCol, compact && styles.dayColCompact]}>
            <Text
              style={[
                styles.weekday,
                compact && styles.weekdayCompact,
                isToday && styles.weekdayToday,
              ]}
            >
              {WEEKDAY_LABELS[lang][index]}
            </Text>

            <View
              style={[
                styles.dateCircle,
                compact && styles.dateCircleCompact,
                workedOut && styles.dateCircleWorked,
                isToday && !workedOut && styles.dateCircleToday,
                isActiveToday && styles.dateCircleActive,
                compact && isActiveToday && styles.dateCircleActiveCompact,
              ]}
            >
              <Text
                style={[
                  styles.dateNum,
                  compact && styles.dateNumCompact,
                  workedOut && styles.dateNumWorked,
                  isToday && !workedOut && styles.dateNumToday,
                ]}
              >
                {date.getDate()}
              </Text>
            </View>

            <View style={[styles.dots, compact && styles.dotsCompact]}>
              {workedOut &&
                muscles.slice(0, 3).map((muscle) => (
                  <View
                    key={muscle}
                    style={[
                      styles.dot,
                      compact && styles.dotCompact,
                      { backgroundColor: muscleColors[muscle] },
                    ]}
                  />
                ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** 이번 주 운동한 날 수 */
export const countWorkoutsThisWeek = (dayMap: Record<string, WorkoutDayInfo>): number => {
  const weekKeys = getCurrentWeekDays().map(toLocalDateKey);
  return weekKeys.filter((key) => dayMap[key]?.workedOut).length;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  containerCompact: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    flex: 1,
  },
  dayCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dayColCompact: {
    gap: 3,
  },
  weekday: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  weekdayCompact: {
    fontSize: 8,
  },
  weekdayToday: {
    color: colors.textPrimary,
    fontFamily: typography.listItem.fontFamily,
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dateCircleCompact: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  // 운동 완료한 날: 검정 채움
  dateCircleWorked: {
    backgroundColor: colors.textPrimary,
  },
  // 오늘 (아직 미완료): 테두리 강조
  dateCircleToday: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.textPrimary,
  },
  // 오늘 세션 진행 중: accent 테두리
  dateCircleActive: {
    borderWidth: 2,
    borderColor: colors.accent,
  },
  dateCircleActiveCompact: {
    borderWidth: 1.5,
  },
  dateNum: {
    fontFamily: typography.listItem.fontFamily,
    fontSize: 14,
    color: colors.textSecondary,
  },
  dateNumCompact: {
    fontSize: 10,
  },
  dateNumWorked: {
    color: colors.background,
  },
  dateNumToday: {
    color: colors.textPrimary,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsCompact: {
    gap: 2,
    height: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotCompact: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});

/** 캘린더 하단 구분선 포함 래퍼 */
export function WeeklyCalendarStrip(props: WeeklyCalendarProps) {
  return (
    <View style={stripStyles.wrap}>
      <WeeklyCalendar {...props} />
      <View style={stripStyles.divider} />
    </View>
  );
}

const stripStyles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.screenPadding,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
