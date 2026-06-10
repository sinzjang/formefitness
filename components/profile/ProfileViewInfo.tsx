// 프로필 정보 — 읽기 전용 (단일 박스 · 2행)
import { View, Text, StyleSheet } from 'react-native';
import type { Language } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useSettingsStore } from '../../stores/settingsStore';
import { useProfilePrefsStore } from '../../stores/profilePrefsStore';
import { useAuthStore } from '../../stores/authStore';

const LANG_LABEL: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
};

interface ProfileViewInfoProps {
  lang: Language;
}

export function ProfileViewInfo({ lang }: ProfileViewInfoProps) {
  const profile = useAuthStore((s) => s.profile);
  const hideWeight = useProfilePrefsStore((s) => s.hideWeight);
  const country = useProfilePrefsStore((s) => s.country);
  const region = useProfilePrefsStore((s) => s.region);

  const appLanguage = useSettingsStore((s) => s.language);
  const bodyWeight = useSettingsStore((s) => s.bodyWeight);
  const bodyHeight = useSettingsStore((s) => s.bodyHeight);
  const weightUnit = profile?.weightUnit ?? 'kg';

  const countryVal = country.trim() || '—';
  const cityVal = region.trim() || '—';
  const langVal = LANG_LABEL[appLanguage];

  const heightVal = bodyHeight != null ? `${bodyHeight} cm` : '—';
  const weightVal = hideWeight
    ? t('profileHidden', lang)
    : bodyWeight != null
      ? `${bodyWeight} ${weightUnit}`
      : '—';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <InfoCell label={t('profileCountry', lang)} value={countryVal} muted={!country.trim()} />
        <Divider />
        <InfoCell label={t('profileCity', lang)} value={cityVal} muted={!region.trim()} />
        <Divider />
        <InfoCell label={t('language', lang)} value={langVal} />
      </View>

      <View style={styles.rowDivider} />

      <View style={styles.row}>
        <InfoCell
          label={t('profileHeight', lang)}
          value={heightVal}
          muted={bodyHeight == null}
          wide
        />
        <Divider />
        <InfoCell
          label={t('profileWeight', lang)}
          value={weightVal}
          muted={hideWeight || bodyWeight == null}
          wide
        />
      </View>
    </View>
  );
}

function InfoCell({
  label,
  value,
  muted,
  wide,
}: {
  label: string;
  value: string;
  muted?: boolean;
  wide?: boolean;
}) {
  return (
    <View style={[styles.cell, wide && styles.cellWide]}>
      <Text style={styles.cellLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.cellValue, muted && styles.cellValueMuted]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.pipe} />;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cellWide: {
    flex: 1,
  },
  cellLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  cellValue: {
    ...typography.listItem,
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cellValueMuted: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  pipe: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: 6,
    alignSelf: 'stretch',
  },
});
