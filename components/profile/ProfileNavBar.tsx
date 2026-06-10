// Profile 상단 — 타이틀 + 설정·편집 버튼
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, typography } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { Icon } from '../ui/Icon';

interface ProfileNavBarProps {
  lang: Language;
  onSettingsPress: () => void;
  onEditPress: () => void;
}

export function ProfileNavBar({ lang, onSettingsPress, onEditPress }: ProfileNavBarProps) {
  return (
    <View style={styles.bar}>
      <Text style={styles.title}>{t('profile', lang)}</Text>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
          onPress={onSettingsPress}
          hitSlop={8}
          accessibilityLabel={t('settings', lang)}
        >
          <Icon name="settings" size={20} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}
          onPress={onEditPress}
          hitSlop={8}
        >
          <Text style={styles.editBtnText}>{t('profileEdit', lang)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    ...typography.sectionHeader,
    fontSize: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.textPrimary,
  },
  btnPressed: {
    opacity: 0.75,
  },
  editBtnText: {
    ...typography.listItem,
    fontSize: 13,
    color: colors.textPrimary,
  },
});
