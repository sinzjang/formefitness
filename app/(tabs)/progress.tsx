// Progress 탭: 차트/히스토리 (Phase 5 Data Viz에서 채워질 자리)
import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';

export default function ProgressScreen() {
  const lang = useLanguage();
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>{t('progress', lang)}</Text>
      <Text style={styles.body}>{t('progressHint', lang)}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
  },
  title: {
    ...typography.sectionHeader,
    fontSize: 22,
  },
  body: {
    ...typography.body,
    marginTop: 12,
  },
});
