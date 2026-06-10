// Goal 전용 스크린 — Progress 탭에서 Goal 설정 후 진입
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ModalSafeArea } from '../ui/ModalSafeArea';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { GoalHeader } from './GoalHeader';
import { GoalScreenTabs } from './GoalScreenTabs';
import { GoalChangePanel } from './GoalChangePanel';
import { GoalComparePanel } from './GoalComparePanel';
import { colors, layout, typography } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import type { GoalScreenTab } from '../../types/goal';
import { useGoalStore } from '../../stores/goalStore';
import { useHistoryStore } from '../../stores/historyStore';
import { getTierName } from '../../constants/tiers';
import { calcDayIndex, calcProgressPct } from '../../lib/goalProgress';
import { pickImageFromCamera, pickImageFromLibrary } from '../../lib/pickImage';

interface GoalScreenProps {
  visible: boolean;
  lang: Language;
  onClose: () => void;
  onEditGoal: () => void;
}

export function GoalScreen({ visible, lang, onClose, onEditGoal }: GoalScreenProps) {
  const wizardAnswers = useGoalStore((s) => s.wizardAnswers);
  const analysisResult = useGoalStore((s) => s.analysisResult);
  const goalImageUri = useGoalStore((s) => s.goalImageUri);
  const setupAt = useGoalStore((s) => s.setupAt);
  const checkins = useGoalStore((s) => s.checkins) ?? [];
  const addCheckin = useGoalStore((s) => s.addCheckin);
  const sessions = useHistoryStore((s) => s.sessions);

  const [tab, setTab] = useState<GoalScreenTab>('change');

  if (!wizardAnswers || !analysisResult || !setupAt) return null;

  const dayIndex = calcDayIndex(setupAt);
  const progressPct = calcProgressPct(dayIndex, analysisResult.timelineMonths);
  const tierName = getTierName(wizardAnswers.targetTier, lang);

  const handleAddPhoto = () => {
    Alert.alert(t('goalScreenAddTodayPhoto', lang), undefined, [
      {
        text: t('goalWizardTakePhoto', lang),
        onPress: async () => {
          const picked = await pickImageFromCamera();
          if (picked?.uri) addCheckin(picked.uri);
        },
      },
      {
        text: t('goalWizardPickGallery', lang),
        onPress: async () => {
          const picked = await pickImageFromLibrary();
          if (picked?.uri) addCheckin(picked.uri);
        },
      },
      { text: t('cancel', lang), style: 'cancel' },
    ]);
  };

  const handleEdit = () => {
    Alert.alert(t('goalScreenEditConfirmTitle', lang), t('goalScreenEditConfirmBody', lang), [
      { text: t('cancel', lang), style: 'cancel' },
      {
        text: t('goalBannerChange', lang),
        style: 'destructive',
        onPress: () => {
          onClose();
          onEditGoal();
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.topTitle}>{t('goalScreenTitle', lang)}</Text>
          <View style={styles.topSpacer} />
        </View>

        <GoalHeader
          lang={lang}
          tierName={tierName}
          dayIndex={dayIndex}
          progressPct={progressPct}
          onEditPress={handleEdit}
        />

        <GoalScreenTabs lang={lang} value={tab} onChange={setTab} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {tab === 'change' ? (
            <GoalChangePanel
              lang={lang}
              checkins={checkins}
              answers={wizardAnswers}
              analysis={analysisResult}
              sessions={sessions}
            />
          ) : (
            <GoalComparePanel
              lang={lang}
              checkins={checkins}
              answers={wizardAnswers}
              analysis={analysisResult}
              goalImageUri={goalImageUri}
              sessions={sessions}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Button title={t('goalScreenAddTodayPhoto', lang)} onPress={handleAddPhoto} />
        </View>
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 10,
  },
  topTitle: {
    ...typography.sectionHeader,
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
  },
  topSpacer: {
    width: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderTopWidth: layout.borderWidth,
    borderTopColor: colors.border,
  },
});
