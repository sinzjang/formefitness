// 날짜 유틸 (로컬 타임존 기준)
import type { Language } from '../types';

/** Date → YYYY-MM-DD (로컬) */
export const toLocalDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/** ISO 문자열 → YYYY-MM-DD (로컬) */
export const isoToLocalDateKey = (iso: string): string => toLocalDateKey(new Date(iso));

/** 이번 주 월~일 7일 (월요일 시작) */
export const getCurrentWeekDays = (anchor: Date = new Date()): Date[] => {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = d.getDay(); // 0=일
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
};

/** 같은 날인지 */
export const isSameDay = (a: Date, b: Date): boolean => toLocalDateKey(a) === toLocalDateKey(b);

/** 세션 타이머 바용 월·일 라벨 (위: 월, 아래: 일) */
export const formatSessionMonthDay = (
  date: Date,
  lang: Language
): { monthLabel: string; dayLabel: string } => {
  if (lang === 'ko') {
    return {
      monthLabel: `${date.getMonth() + 1}월`,
      dayLabel: `${date.getDate()}일`,
    };
  }
  return {
    monthLabel: date.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    dayLabel: String(date.getDate()),
  };
};
