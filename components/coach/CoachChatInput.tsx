// 코치 채팅 입력
import { useState } from 'react';
import { View, TextInput, Pressable, StyleSheet } from 'react-native';
import { Icon } from '../ui/Icon';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';

const MAX_LEN = 500;

interface CoachChatInputProps {
  lang: Language;
  disabled?: boolean;
  onSend: (text: string) => void;
  /** 플로팅 말풍선 — 좁은 패널용 패딩 */
  compact?: boolean;
}

export function CoachChatInput({ lang, disabled, onSend, compact }: CoachChatInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <TextInput
        style={styles.input}
        placeholder={t('coachInputPlaceholder', lang)}
        placeholderTextColor={colors.textMuted}
        value={text}
        onChangeText={setText}
        maxLength={MAX_LEN}
        multiline
        editable={!disabled}
        returnKeyType="send"
        onSubmitEditing={handleSend}
      />
      <Pressable
        style={[styles.sendBtn, (!text.trim() || disabled) && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <Icon name="arrow-up" size={18} color={colors.background} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  wrapCompact: {
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    maxHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});
