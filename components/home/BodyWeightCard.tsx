// Home — 체중 표시·입력
import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, typography, layout, fonts } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAuthStore } from '../../stores/authStore';
import { useProfilePrefsStore } from '../../stores/profilePrefsStore';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';

interface BodyWeightCardProps {
  lang: Language;
}

export function BodyWeightCard({ lang }: BodyWeightCardProps) {
  const bodyWeight = useSettingsStore((s) => s.bodyWeight);
  const setBodyWeight = useSettingsStore((s) => s.setBodyWeight);
  const hideWeight = useProfilePrefsStore((s) => s.hideWeight);
  const weightUnit = useAuthStore((s) => s.profile?.weightUnit) ?? 'kg';

  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const openEditor = () => {
    setDraft(bodyWeight != null ? String(bodyWeight) : '');
    setEditorOpen(true);
  };

  const save = () => {
    const n = parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      setBodyWeight(undefined);
    } else {
      setBodyWeight(Math.round(n * 10) / 10);
    }
    setEditorOpen(false);
  };

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={openEditor}
      >
        <Text style={styles.label}>{t('homeBodyWeight', lang)}</Text>
        <View style={styles.valueRow}>
          <Text style={styles.value}>
            {hideWeight ? '—' : bodyWeight != null ? bodyWeight : '—'}
          </Text>
          {!hideWeight && <Text style={styles.unit}>{weightUnit}</Text>}
        </View>
        <Text style={styles.hint}>{t('homeBodyWeightHint', lang)}</Text>
      </Pressable>

      <Modal visible={editorOpen} transparent animationType="fade" onRequestClose={() => setEditorOpen(false)}>
        <SafeAreaProvider>
          <BodyWeightEditor
            lang={lang}
            draft={draft}
            weightUnit={weightUnit}
            onChangeDraft={setDraft}
            onClose={() => setEditorOpen(false)}
            onSave={save}
          />
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

function BodyWeightEditor({
  lang,
  draft,
  weightUnit,
  onChangeDraft,
  onClose,
  onSave,
}: {
  lang: Language;
  draft: string;
  weightUnit: string;
  onChangeDraft: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[
        styles.modalRoot,
        {
          paddingTop: insets.top + layout.screenPadding,
          paddingBottom: insets.bottom + layout.screenPadding,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View style={styles.modalSheet}>
        <Text style={styles.modalTitle}>{t('homeBodyWeightEdit', lang)}</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={onChangeDraft}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
          <Text style={styles.inputUnit}>{weightUnit}</Text>
        </View>
        <View style={styles.modalActions}>
          <Pressable style={styles.modalBtnGhost} onPress={onClose}>
            <Text style={styles.modalBtnGhostText}>{t('cancel', lang)}</Text>
          </Pressable>
          <Pressable style={styles.modalBtnPrimary} onPress={onSave}>
            <Icon name="check" size={18} color={colors.background} />
            <Text style={styles.modalBtnPrimaryText}>{t('save', lang)}</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: layout.cardRadius,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    minHeight: 88,
  },
  cardPressed: {
    backgroundColor: colors.surface,
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  value: {
    fontFamily: fonts.black900Italic,
    fontSize: 28,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    ...typography.caption,
    fontFamily: fonts.bold700,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  hint: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,17,17,0.35)',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderRadius: layout.cardRadius,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    padding: 20,
  },
  modalTitle: {
    ...typography.sectionHeader,
    fontSize: 16,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    ...typography.heroTitle,
    fontSize: 32,
    color: colors.textPrimary,
    borderBottomWidth: 2,
    borderBottomColor: colors.textPrimary,
    paddingVertical: 4,
  },
  inputUnit: {
    ...typography.listItem,
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalBtnGhostText: {
    ...typography.listItem,
    color: colors.textSecondary,
  },
  modalBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modalBtnPrimaryText: {
    ...typography.button,
    color: colors.background,
    fontSize: 12,
  },
});
