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

/** 월요일 시작 달력 그리드 (null = 빈 칸) */
export const getMonthMatrix = (viewMonth: Date): (Date | null)[][] => {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7; // 월요일=0

  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
};

export const formatMonthYear = (date: Date, lang: Language): string => {
  if (lang === 'ko') return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

export const weekdayLabels = (lang: Language): string[] =>
  lang === 'ko'
    ? ['월', '화', '수', '목', '금', '토', '일']
    : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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
