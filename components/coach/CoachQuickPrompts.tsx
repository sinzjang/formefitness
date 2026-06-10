// 코치 채팅 — 자주 묻는 질문 칩 (2열 그리드)
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { COACH_QUICK_PROMPT_KEYS } from '../../lib/coachQuickPrompts';
import type { Language } from '../../types';

interface CoachQuickPromptsProps {
  lang: Language;
  disabled?: boolean;
  onSelect: (text: string) => void;
}

export function CoachQuickPrompts({ lang, disabled, onSelect }: CoachQuickPromptsProps) {
  return (
    <View style={styles.grid}>
      {COACH_QUICK_PROMPT_KEYS.map((key) => {
        const label = t(key, lang);
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.chip,
              disabled && styles.chipDisabled,
              pressed && !disabled && styles.chipPressed,
            ]}
            onPress={() => onSelect(label)}
            disabled={disabled}
          >
            <Text style={styles.chipText} numberOfLines={2}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '48%',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: colors.surface,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
  },
});
