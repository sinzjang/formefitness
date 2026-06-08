// Home 하단 AI 코치 채팅 섹션
import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { CoachName, Language } from '../../types';
import { useCoachStore } from '../../stores/coachStore';
import { useUserStore } from '../../stores/userStore';
import { CoachMessageBubble, CoachTypingIndicator } from './CoachMessageBubble';
import { CoachChatInput } from './CoachChatInput';
import { CoachAvatar } from './CoachAvatar';

interface CoachChatProps {
  lang: Language;
  coachName: CoachName;
}

export function CoachChat({ lang, coachName }: CoachChatProps) {
  const messages = useCoachStore((s) => s.messages);
  const isLoading = useCoachStore((s) => s.isLoading);
  const sendUserMessage = useCoachStore((s) => s.sendUserMessage);
  const onLanguageChanged = useCoachStore((s) => s.onLanguageChanged);
  const goalImageUrl = useUserStore((s) => s.profile?.goalImageUrl);

  const scrollRef = useRef<ScrollView>(null);

  // 언어 변경·앱 진입 시 코치 인사/채팅 언어 동기화
  useEffect(() => {
    onLanguageChanged(lang);
  }, [lang, onLanguageChanged]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isLoading]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <View style={styles.header}>
        <CoachAvatar coachName={coachName} size={28} />
        <Text style={styles.headerTitle}>{coachName}</Text>
        <Text style={styles.headerBadge}>{t('coachBadge', lang)}</Text>
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

      <CoachChatInput lang={lang} disabled={isLoading} onSend={sendUserMessage} />
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
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 14,
    paddingBottom: 8,
  },
});
