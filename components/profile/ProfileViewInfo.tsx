// 프로필 정보 — 읽기 전용 (단일 박스 · 1행)
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
      <View style={styles.metaRow}>
        <MetaItem label={t('profileCountry', lang)} value={countryVal} muted={!country.trim()} />
        <Text style={styles.metaPipe}>|</Text>
        <MetaItem label={t('profileCity', lang)} value={cityVal} muted={!region.trim()} />
        <Text style={styles.metaPipe}>|</Text>
        <MetaItem label={t('language', lang)} value={langVal} />
        <Text style={styles.metaPipe}>|</Text>
        <MetaItem label={t('profileHeight', lang)} value={heightVal} muted={bodyHeight == null} />
        <Text style={styles.metaPipe}>|</Text>
        <MetaItem
          label={t('profileWeight', lang)}
          value={weightVal}
          muted={hideWeight || bodyWeight == null}
        />
      </View>
    </View>
  );
}

function MetaItem({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.metaValue, muted && styles.cellValueMuted]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  metaLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    fontSize: 7,
    lineHeight: 9,
    letterSpacing: 0,
    color: colors.textMuted,
    marginBottom: 2,
    textAlign: 'center',
  },
  metaValue: {
    ...typography.listItem,
    fontSize: 9,
    lineHeight: 11,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  metaPipe: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: 2,
  },
  cellValueMuted: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
