// 채팅 메시지 버블
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import type { CoachMessage, CoachName, Language } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { CoachAvatar } from './CoachAvatar';
import { GoalImageCard } from './GoalImageCard';
import { RoutineWarningCard } from './RoutineWarningCard';
import { ChartPlaceholderCard } from './ChartPlaceholderCard';

interface CoachMessageBubbleProps {
  message: CoachMessage;
  coachName: CoachName;
  lang: Language;
  goalImageUrl?: string;
}

export function CoachMessageBubble({ message, coachName, lang, goalImageUrl }: CoachMessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && <CoachAvatar coachName={coachName} size={32} />}

      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleCoach]}>
        <Text style={[styles.text, isUser && styles.textUser]}>{message.text}</Text>

        {!isUser && message.showGoalImage && (
          <GoalImageCard lang={lang} imageUrl={goalImageUrl} />
        )}

        {!isUser && message.recommendedRoutine && (
          <RoutineWarningCard lang={lang} routine={message.recommendedRoutine} />
        )}

        {!isUser && message.chart && <ChartPlaceholderCard lang={lang} chart={message.chart} />}
      </View>
    </View>
  );
}

export function CoachTypingIndicator({ coachName }: { coachName: CoachName }) {
  return (
    <View style={styles.row}>
      <CoachAvatar coachName={coachName} size={32} />
      <View style={[styles.bubble, styles.bubbleCoach, styles.typing]}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  rowUser: {
    flexDirection: 'row-reverse',
  },
  bubble: {
    flex: 1,
    maxWidth: '82%',
    borderRadius: layout.cardRadius,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleCoach: {
    backgroundColor: colors.surface,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
  },
  bubbleUser: {
    backgroundColor: colors.textPrimary,
  },
  text: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  textUser: {
    color: colors.background,
  },
  typing: {
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 56,
  },
});
