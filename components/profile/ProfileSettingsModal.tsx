// 앱 설정 모달 — 알림 · AI API
import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ModalSafeArea } from '../ui/ModalSafeArea';
import type { Language } from '../../types';
import type { AiProvider } from '../../types/ai';
import { AI_PROVIDERS } from '../../types/ai';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { Icon } from '../ui/Icon';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAiSettingsStore } from '../../stores/aiSettingsStore';
import { testProviderConnection } from '../../lib/aiProvider';

const PROVIDER_LABEL: Record<AiProvider, string> = {
  openai: 'OpenAI',
  claude: 'Claude',
  gemini: 'Gemini',
};

interface ProfileSettingsModalProps {
  visible: boolean;
  lang: Language;
  onClose: () => void;
}

export function ProfileSettingsModal({ visible, lang, onClose }: ProfileSettingsModalProps) {
  const restAlertsEnabled = useSettingsStore((s) => s.restAlertsEnabled);
  const setRestAlertsEnabled = useSettingsStore((s) => s.setRestAlertsEnabled);

  const provider = useAiSettingsStore((s) => s.provider);
  const apiKeys = useAiSettingsStore((s) => s.apiKeys);
  const models = useAiSettingsStore((s) => s.models);
  const setProvider = useAiSettingsStore((s) => s.setProvider);
  const setApiKey = useAiSettingsStore((s) => s.setApiKey);
  const setModel = useAiSettingsStore((s) => s.setModel);

  const [testing, setTesting] = useState<AiProvider | null>(null);
  const [testResult, setTestResult] = useState<Partial<Record<AiProvider, boolean>>>({});

  const handleTest = async (p: AiProvider) => {
    setTesting(p);
    const ok = await testProviderConnection(p);
    setTestResult((prev) => ({ ...prev, [p]: ok }));
    setTesting(null);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('settings', lang)}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 알림 */}
          <Text style={styles.sectionTitle}>{t('settingsNotifications', lang)}</Text>
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>{t('restAlerts', lang)}</Text>
                <Text style={styles.toggleHint}>{t('settingsRestAlertsHint', lang)}</Text>
              </View>
              <Switch
                value={restAlertsEnabled}
                onValueChange={setRestAlertsEnabled}
                trackColor={{ false: colors.border, true: colors.textPrimary }}
                thumbColor={colors.background}
              />
            </View>
          </View>

          {/* AI API */}
          <Text style={styles.sectionTitle}>{t('settingsAiApi', lang)}</Text>
          <Text style={styles.sectionHint}>{t('settingsAiApiHint', lang)}</Text>

          <View style={styles.providerRow}>
            {AI_PROVIDERS.map((p) => {
              const active = provider === p;
              return (
                <Pressable
                  key={p}
                  style={[styles.providerChip, active && styles.providerChipActive]}
                  onPress={() => setProvider(p)}
                >
                  <Text style={[styles.providerChipText, active && styles.providerChipTextActive]}>
                    {PROVIDER_LABEL[p]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.activeProvider}>
            {t('settingsAiActive', lang)}: {PROVIDER_LABEL[provider]}
          </Text>

          {AI_PROVIDERS.map((p) => (
            <View key={p} style={styles.apiCard}>
              <Text style={styles.apiCardTitle}>{PROVIDER_LABEL[p]}</Text>
              <Text style={styles.fieldLabel}>{t('settingsApiKey', lang)}</Text>
              <TextInput
                style={styles.input}
                value={apiKeys[p]}
                onChangeText={(v) => setApiKey(p, v)}
                placeholder={t('settingsApiKeyPlaceholder', lang)}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Text style={styles.fieldLabel}>{t('settingsApiModel', lang)}</Text>
              <TextInput
                style={styles.input}
                value={models[p]}
                onChangeText={(v) => setModel(p, v)}
                placeholder="model-id"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={styles.testBtn}
                onPress={() => void handleTest(p)}
                disabled={testing === p}
              >
                {testing === p ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Text style={styles.testBtnText}>{t('settingsApiTest', lang)}</Text>
                )}
              </Pressable>
              {testResult[p] !== undefined && (
                <Text style={[styles.testResult, testResult[p] ? styles.testOk : styles.testFail]}>
                  {testResult[p] ? t('settingsApiTestOk', lang) : t('settingsApiTestFail', lang)}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.listItem,
    fontSize: 16,
  },
  headerSpacer: {
    width: 24,
  },
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: 32,
    gap: 12,
  },
  sectionTitle: {
    ...typography.sectionHeader,
    fontSize: 13,
    marginTop: 8,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 4,
  },
  card: {
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 14,
    backgroundColor: colors.background,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.listItem,
    fontSize: 14,
  },
  toggleHint: {
    ...typography.caption,
    marginTop: 2,
    color: colors.textMuted,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  providerChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  providerChipActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  providerChipText: {
    ...typography.listItem,
    fontSize: 12,
    color: colors.textSecondary,
  },
  providerChipTextActive: {
    color: colors.background,
  },
  activeProvider: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  apiCard: {
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    padding: 14,
    gap: 6,
    backgroundColor: colors.surface,
  },
  apiCardTitle: {
    ...typography.listItem,
    fontSize: 15,
    marginBottom: 4,
  },
  fieldLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginTop: 4,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  testBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 72,
    alignItems: 'center',
  },
  testBtnText: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
  },
  testResult: {
    ...typography.caption,
    marginTop: 4,
  },
  testOk: {
    color: colors.success,
  },
  testFail: {
    color: colors.accent,
  },
});
