// Goal 스크린 — 나의 변화 / 목표 비교 탭
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import type { GoalScreenTab } from '../../types/goal';

interface GoalScreenTabsProps {
  lang: Language;
  value: GoalScreenTab;
  onChange: (tab: GoalScreenTab) => void;
}

export function GoalScreenTabs({ lang, value, onChange }: GoalScreenTabsProps) {
  return (
    <View style={styles.row}>
      {(['change', 'compare'] as const).map((key) => {
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
              {key === 'change' ? t('goalScreenTabChange', lang) : t('goalScreenTabCompare', lang)}
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
    marginHorizontal: layout.screenPadding,
    marginTop: 12,
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
    fontSize: 12,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: colors.background,
  },
});
