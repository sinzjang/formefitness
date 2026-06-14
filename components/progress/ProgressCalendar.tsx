// Progress — 월간 달력 (운동한 날 표시)
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Language } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { Icon } from '../ui/Icon';
import {
  formatMonthYear,
  getMonthMatrix,
  isSameDay,
  toLocalDateKey,
  weekdayLabels,
} from '../../lib/dates';
import type { WorkoutDayInfo } from '../../stores/historyStore';

interface ProgressCalendarProps {
  lang: Language;
  viewMonth: Date;
  selectedDate: Date;
  dayMap: Record<string, WorkoutDayInfo>;
  onViewMonthChange: (date: Date) => void;
  onSelectDate: (date: Date) => void;
  onAddWorkout?: (date: Date) => void;
}

export function ProgressCalendar({
  lang,
  viewMonth,
  selectedDate,
  dayMap,
  onViewMonthChange,
  onSelectDate,
  onAddWorkout,
}: ProgressCalendarProps) {
  const matrix = getMonthMatrix(viewMonth);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1);
    onViewMonthChange(next);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {/* 왼쪽: 이전/다음 화살표 + 월 표시 */}
        <View style={styles.headerLeft}>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
            onPress={() => shiftMonth(-1)}
            hitSlop={8}
            accessibilityLabel="Previous month"
          >
            <Icon name="chevron-back" size={20} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.monthLabel}>{formatMonthYear(viewMonth, lang)}</Text>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && styles.navBtnPressed]}
            onPress={() => shiftMonth(1)}
            hitSlop={8}
            accessibilityLabel="Next month"
          >
            <Icon name="chevron-forward" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>
        {/* 오른쪽: 선택된 날짜에 운동 추가 */}
        {onAddWorkout && (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.navBtnPressed]}
            onPress={() => onAddWorkout(selectedDate)}
            hitSlop={8}
            accessibilityLabel="Add workout for selected date"
          >
            <Icon name="add" size={22} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      <View style={styles.weekRow}>
        {weekdayLabels(lang).map((label, i) => (
          <Text key={`${label}-${i}`} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>

      {matrix.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((date, di) => {
            if (!date) {
              return <View key={di} style={styles.dayCell} />;
            }

            const key = toLocalDateKey(date);
            const workedOut = dayMap[key]?.workedOut;
            const selected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);

            return (
              <Pressable
                key={di}
                style={({ pressed }) => [
                  styles.dayCell,
                  selected && styles.dayCellSelected,
                  isToday && !selected && styles.dayCellToday,
                  pressed && styles.dayCellPressed,
                ]}
                onPress={() => onSelectDate(date)}
              >
                <Text
                  style={[
                    styles.dayText,
                    selected && styles.dayTextSelected,
                    isToday && !selected && styles.dayTextToday,
                  ]}
                >
                  {date.getDate()}
                </Text>
                {workedOut && (
                  <View style={[styles.dot, selected && styles.dotSelected]} />
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 14,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnPressed: {
    opacity: 0.5,
  },
  monthLabel: {
    ...typography.listItem,
    fontSize: 16,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    maxHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: colors.textPrimary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCellPressed: {
    opacity: 0.7,
  },
  dayText: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
    fontSize: 13,
  },
  dayTextSelected: {
    color: colors.background,
  },
  dayTextToday: {
    color: colors.accent,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 2,
  },
  dotSelected: {
    backgroundColor: colors.background,
  },
});
