// 프로필 편집 모달
import { useEffect, useState, type ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { ModalSafeArea } from '../ui/ModalSafeArea';
import type { Language } from '../../types';
import { colors, typography, layout, fonts } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { Icon } from '../ui/Icon';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useProfilePrefsStore } from '../../stores/profilePrefsStore';
import { pickImageFromLibrary } from '../../lib/pickImage';
import { ImageCropModal } from '../ui/ImageCropModal';
import { syncNicknameToRemote } from '../../lib/profileSync';

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
];

interface ProfileEditModalProps {
  visible: boolean;
  lang: Language;
  onClose: () => void;
}

interface EditDraft {
  avatarUri?: string;
  nickname: string;
  hideEmail: boolean;
  country: string;
  region: string;
  language: Language;
  hideWeight: boolean;
  bodyHeight: string;
  bodyWeight: string;
}

export function ProfileEditModal({ visible, lang, onClose }: ProfileEditModalProps) {
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const email = profile?.email ?? user?.email ?? '';
  const weightUnit = profile?.weightUnit ?? 'kg';

  const [avatarCropTarget, setAvatarCropTarget] = useState<{
    uri: string;
    width?: number;
    height?: number;
  } | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    avatarUri: undefined,
    nickname: '',
    hideEmail: false,
    country: '',
    region: '',
    language: 'ko',
    hideWeight: false,
    bodyHeight: '',
    bodyWeight: '',
  });

  useEffect(() => {
    if (!visible) return;
    const p = useProfilePrefsStore.getState();
    const settings = useSettingsStore.getState();
    setDraft({
      avatarUri: p.avatarUri,
      nickname: p.nickname || profile?.displayName || '',
      hideEmail: p.hideEmail,
      country: p.country,
      region: p.region,
      language: settings.language,
      hideWeight: p.hideWeight,
      bodyHeight: settings.bodyHeight != null ? String(settings.bodyHeight) : '',
      bodyWeight: settings.bodyWeight != null ? String(settings.bodyWeight) : '',
    });
  }, [visible, profile?.displayName]);

  const patch = (next: Partial<EditDraft>) => setDraft((d) => ({ ...d, ...next }));

  const handlePickAvatar = () => {
    void pickImageFromLibrary().then((picked) => {
      if (picked) setAvatarCropTarget(picked);
    });
  };

  const handleSave = () => {
    const p = useProfilePrefsStore.getState();
    p.setAvatarUri(draft.avatarUri);
    p.setNickname(draft.nickname);
    p.setHideEmail(draft.hideEmail);
    p.setCountry(draft.country);
    p.setRegion(draft.region);
    p.setHideWeight(draft.hideWeight);

    useSettingsStore.getState().setLanguage(draft.language);

    const h = parseFloat(draft.bodyHeight.replace(',', '.'));
    if (!Number.isFinite(h) || h <= 0) {
      useSettingsStore.getState().setBodyHeight(undefined);
    } else {
      useSettingsStore.getState().setBodyHeight(Math.round(h));
    }

    const w = parseFloat(draft.bodyWeight.replace(',', '.'));
    if (!Number.isFinite(w) || w <= 0) {
      useSettingsStore.getState().setBodyWeight(undefined);
    } else {
      useSettingsStore.getState().setBodyWeight(Math.round(w * 10) / 10);
    }

    void syncNicknameToRemote(draft.nickname).catch(() => {});
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.modalTitle}>{t('profileEditTitle', lang)}</Text>
            <Pressable onPress={handleSave} hitSlop={8}>
              <Text style={styles.saveText}>{t('save', lang)}</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 아바타 */}
            <Pressable style={styles.avatarWrap} onPress={handlePickAvatar}>
              {draft.avatarUri ? (
                <Image source={{ uri: draft.avatarUri }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Icon name="person" size={36} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Icon name="image" size={12} color={colors.background} />
              </View>
            </Pressable>

            {/* 닉네임 */}
            <FieldBlock label={t('profileNickname', lang)}>
              <TextInput
                style={styles.input}
                value={draft.nickname}
                onChangeText={(nickname) => patch({ nickname })}
                placeholder={t('profileNicknamePlaceholder', lang)}
                placeholderTextColor={colors.textMuted}
                maxLength={32}
              />
              <Text style={styles.hint}>{t('profileNicknameHint', lang)}</Text>
            </FieldBlock>

            {/* 이메일 공개 */}
            <ToggleRow
              label={t('profileEmail', lang)}
              sub={email || '—'}
              value={!draft.hideEmail}
              onChange={(show) => patch({ hideEmail: !show })}
            />

            <FieldBlock label={`${t('profileCountry', lang)} ${t('profileOptional', lang)}`}>
              <TextInput
                style={styles.input}
                value={draft.country}
                onChangeText={(country) => patch({ country })}
                placeholder={t('profileCountryPlaceholder', lang)}
                placeholderTextColor={colors.textMuted}
                maxLength={48}
              />
            </FieldBlock>

            <FieldBlock label={`${t('language', lang)} ${t('profileOptional', lang)}`}>
              <View style={styles.langRow}>
                {LANGUAGES.map((item) => {
                  const active = draft.language === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.langChip, active && styles.langChipActive]}
                      onPress={() => patch({ language: item.id })}
                    >
                      <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </FieldBlock>

            <FieldBlock label={`${t('profileCity', lang)} ${t('profileOptional', lang)}`}>
              <TextInput
                style={styles.input}
                value={draft.region}
                onChangeText={(region) => patch({ region })}
                placeholder={t('profileRegionPlaceholder', lang)}
                placeholderTextColor={colors.textMuted}
                maxLength={48}
              />
            </FieldBlock>

            {/* 신장 */}
            <FieldBlock label={t('profileHeight', lang)}>
              <View style={styles.weightRow}>
                <TextInput
                  style={[styles.input, styles.weightInput]}
                  value={draft.bodyHeight}
                  onChangeText={(bodyHeight) => patch({ bodyHeight })}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.weightUnit}>cm</Text>
              </View>
            </FieldBlock>

            {/* 체중 */}
            <FieldBlock label={t('profileWeight', lang)}>
              <View style={styles.weightRow}>
                <TextInput
                  style={[styles.input, styles.weightInput]}
                  value={draft.bodyWeight}
                  onChangeText={(bodyWeight) => patch({ bodyWeight })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
                <Text style={styles.weightUnit}>{weightUnit}</Text>
              </View>
            </FieldBlock>
            <ToggleRow
              label={t('profileShowWeight', lang)}
              value={!draft.hideWeight}
              onChange={(show) => patch({ hideWeight: !show })}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </ModalSafeArea>

      <ImageCropModal
        visible={!!avatarCropTarget}
        imageUri={avatarCropTarget?.uri ?? null}
        imageWidth={avatarCropTarget?.width}
        imageHeight={avatarCropTarget?.height}
        lang={lang}
        onCancel={() => setAvatarCropTarget(null)}
        onConfirm={(uri) => {
          patch({ avatarUri: uri });
          setAvatarCropTarget(null);
        }}
      />
    </Modal>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleMain}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {sub ? <Text style={styles.toggleSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.textPrimary }}
        thumbColor={colors.background}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.listItem,
    fontSize: 16,
  },
  saveText: {
    ...typography.listItem,
    fontSize: 15,
    color: colors.accent,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: layout.screenPadding,
    paddingBottom: 32,
    gap: 16,
  },
  avatarWrap: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    marginBottom: 4,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
  },
  hint: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  langChipText: {
    ...typography.listItem,
    fontSize: 13,
    color: colors.textSecondary,
  },
  langChipTextActive: {
    color: colors.background,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightInput: {
    flex: 1,
    fontFamily: fonts.bold700,
    fontSize: 18,
  },
  weightUnit: {
    ...typography.listItem,
    color: colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleMain: {
    flex: 1,
    minWidth: 0,
  },
  toggleLabel: {
    ...typography.listItem,
    fontSize: 14,
  },
  toggleSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
