// Profile 탭: 설정/프로필 (언어, 기본 휴식, 알림 등)
import { View, Text, Pressable, StyleSheet, Switch } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Language } from '../../types';
import { REST_OPTIONS } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useSettingsStore } from '../../stores/settingsStore';

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
];

export default function ProfileScreen() {
  const language = useSettingsStore((s) => s.language);
  const defaultRestSeconds = useSettingsStore((s) => s.defaultRestSeconds);
  const restAlertsEnabled = useSettingsStore((s) => s.restAlertsEnabled);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setDefaultRestSeconds = useSettingsStore((s) => s.setDefaultRestSeconds);
  const setRestAlertsEnabled = useSettingsStore((s) => s.setRestAlertsEnabled);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{t('profile', language)}</Text>

      {/* 언어 */}
      <Text style={styles.sectionLabel}>{t('language', language)}</Text>
      <View style={styles.segment}>
        {LANGUAGES.map((item) => {
          const active = language === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
              onPress={() => setLanguage(item.id)}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 기본 휴식 시간 (새 운동 추가 시 적용) */}
      <Text style={styles.sectionLabel}>{t('defaultRestTime', language)}</Text>
      <View style={styles.restRow}>
        {REST_OPTIONS.map((sec) => {
          const active = defaultRestSeconds === sec;
          return (
            <Pressable
              key={sec}
              style={[styles.restChip, active && styles.restChipActive]}
              onPress={() => setDefaultRestSeconds(sec)}
            >
              <Text style={[styles.restChipText, active && styles.restChipTextActive]}>
                {sec}s
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 휴식 알림 (햅틱 + 진동) */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{t('restAlerts', language)}</Text>
        <Switch
          value={restAlertsEnabled}
          onValueChange={setRestAlertsEnabled}
          trackColor={{ false: colors.border, true: colors.textPrimary }}
          thumbColor={colors.background}
        />
      </View>

      {/* ExerciseDB GIF 연동 테스트 */}
      <Pressable style={styles.devLink} onPress={() => router.push('/exercise-db-test')}>
        <Text style={styles.devLinkText}>ExerciseDB GIF 테스트</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
  },
  title: {
    ...typography.sectionHeader,
    fontSize: 22,
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 8,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentItemActive: {
    backgroundColor: colors.background,
  },
  segmentText: {
    ...typography.listItem,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  restRow: {
    flexDirection: 'row',
    gap: 8,
  },
  restChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  restChipActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.textPrimary,
  },
  restChipText: {
    ...typography.listItem,
    fontSize: 14,
    color: colors.textSecondary,
  },
  restChipTextActive: {
    color: colors.background,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  toggleLabel: {
    ...typography.listItem,
    fontSize: 14,
    flex: 1,
    paddingRight: 12,
  },
  devLink: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
  },
  devLinkText: {
    ...typography.listItem,
    fontSize: 14,
  },
});
