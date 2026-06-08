// Formé 디자인 시스템 (색상 + 타이포그래피)
// 주의: 화면 표기용 브랜드는 "Formé"(악센트), 코드/식별자는 "Forme"(시스템) 규칙 적용

export const colors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  border: '#E5E5E5',
  textPrimary: '#111111',
  textSecondary: '#888888',
  textMuted: '#BBBBBB',
  accent: '#FF4D1C',
  success: '#22C55E',
  warning: '#FF8C42',
  danger: '#FF4D1C',
  fatigueNone: '#CCCCCC',
} as const;

export const muscleColors = {
  chest: '#FF4D1C',
  shoulder: '#FF8C42',
  back: '#22C55E',
  arms: '#3B82F6',
  core: '#8B5CF6',
  legs: '#111111',
} as const;

export const fonts = {
  black900Italic: 'Barlow_900Black_Italic',
  bold700: 'Barlow_700Bold',
  semibold600: 'Barlow_600SemiBold',
  regular400: 'Barlow_400Regular',
  light300: 'Barlow_300Light',
} as const;

export const typography = {
  heroTitle: {
    fontFamily: fonts.black900Italic,
    fontSize: 48,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    fontFamily: fonts.bold700,
    fontSize: 20,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  listItem: {
    fontFamily: fonts.semibold600,
    fontSize: 15,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fonts.regular400,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.light300,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  button: {
    fontFamily: fonts.bold700,
    fontSize: 13,
    color: colors.background,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
} as const;

export const layout = {
  screenPadding: 20,
  cardRadius: 12,
  borderWidth: 1,
} as const;
