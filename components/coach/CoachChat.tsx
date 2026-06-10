// AI 코치 채팅 (플로팅 말풍선 / 인라인)
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { CoachName, Language } from '../../types';
import { useCoachStore } from '../../stores/coachStore';
import { useUserStore } from '../../stores/userStore';
import { Icon } from '../ui/Icon';
import { CoachMessageBubble, CoachTypingIndicator } from './CoachMessageBubble';
import { CoachChatInput } from './CoachChatInput';
import { CoachQuickPrompts } from './CoachQuickPrompts';
import { CoachAvatar } from './CoachAvatar';

interface CoachChatProps {
  lang: Language;
  coachName: CoachName;
  variant?: 'embedded' | 'floating';
  onClose?: () => void;
}

export function CoachChat({
  lang,
  coachName,
  variant = 'embedded',
  onClose,
}: CoachChatProps) {
  const messages = useCoachStore((s) => s.messages);
  const isLoading = useCoachStore((s) => s.isLoading);
  const sendUserMessage = useCoachStore((s) => s.sendUserMessage);
  const onLanguageChanged = useCoachStore((s) => s.onLanguageChanged);
  const goalImageUrl = useUserStore((s) => s.profile?.goalImageUrl);

  const scrollRef = useRef<ScrollView>(null);
  const isFloating = variant === 'floating';

  // 언어 변경 시 코치 인사/채팅 언어 동기화
  useEffect(() => {
    onLanguageChanged(lang);
  }, [lang, onLanguageChanged]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isLoading]);

  const handleQuickPrompt = (text: string) => {
    void sendUserMessage(text);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, isFloating && styles.containerFloating]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? (isFloating ? 12 : 88) : 0}
    >
      <View style={styles.header}>
        <CoachAvatar coachName={coachName} size={28} />
        <Text style={styles.headerTitle}>{coachName}</Text>
        <Text style={[styles.headerBadge, !isFloating && styles.headerBadgeEnd]}>
          {t('coachBadge', lang)}
        </Text>
        {isFloating && onClose && (
          <Pressable
            onPress={onClose}
            hitSlop={8}
            style={styles.closeBtn}
            accessibilityLabel={t('coachFabClose', lang)}
          >
            <Icon name="close" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <CoachMessageBubble
            key={msg.id}
            message={msg}
            coachName={coachName}
            lang={lang}
            goalImageUrl={goalImageUrl}
          />
        ))}
        {isLoading && <CoachTypingIndicator coachName={coachName} />}
      </ScrollView>

      <CoachQuickPrompts lang={lang} disabled={isLoading} onSelect={handleQuickPrompt} />

      <CoachChatInput
        lang={lang}
        disabled={isLoading}
        onSend={sendUserMessage}
        compact={isFloating}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 16,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  containerFloating: {
    marginTop: 0,
    borderWidth: 0,
    borderRadius: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  headerTitle: {
    ...typography.listItem,
    fontSize: 15,
  },
  headerBadge: {
    ...typography.caption,
    marginLeft: 'auto',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  headerBadgeEnd: {
    marginRight: 0,
  },
  closeBtn: {
    marginLeft: 4,
    padding: 2,
  },
  messages: {
    flex: 1,
    minHeight: 160,
  },
  messagesContent: {
    padding: 14,
    paddingBottom: 8,
  },
});
