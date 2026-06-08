// Progress — Streak / Detail 세그먼트 탭
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';

export type ProgressPanel = 'streak' | 'detail';

interface ProgressSegmentTabsProps {
  lang: Language;
  value: ProgressPanel;
  onChange: (value: ProgressPanel) => void;
}

export function ProgressSegmentTabs({ lang, value, onChange }: ProgressSegmentTabsProps) {
  return (
    <View style={styles.row}>
      {(['streak', 'detail'] as const).map((key) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            style={({ pressed }) => [
              styles.tab,
              active && styles.tabActive,
              pressed && styles.tabPressed,
            ]}
            onPress={() => onChange(key)}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>
              {key === 'streak' ? t('progressStreak', lang) : t('progressDetail', lang)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  tabActive: {
    backgroundColor: colors.textPrimary,
  },
  tabPressed: {
    opacity: 0.85,
  },
  tabText: {
    ...typography.button,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tabTextActive: {
    color: colors.background,
  },
});
