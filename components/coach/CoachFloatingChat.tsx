// 우하단 플로팅 코치 버튼 + 말풍선 대화창
import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage, useSettingsStore } from '../../stores/settingsStore';
import { useCoachStore } from '../../stores/coachStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { SESSION_DOCK_HEIGHT } from '../workout/ActiveSessionDock';
import { CoachChat } from './CoachChat';
import { CoachAvatar } from './CoachAvatar';

const FAB_SIZE = 56;
/** react-navigation 기본 탭바 높이 (safe area 제외) */
const TAB_BAR_HEIGHT = 49;

export function CoachFloatingChat() {
  const lang = useLanguage();
  const coachName = useSettingsStore((s) => s.coachName);
  const fetchDailyGreetingIfNeeded = useCoachStore((s) => s.fetchDailyGreetingIfNeeded);
  const session = useWorkoutStore((s) => s.session);
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const sessionDockVisible = Boolean(session?.runningStartedAt);
  const stackBottom = tabBarHeight + (sessionDockVisible ? SESSION_DOCK_HEIGHT : 0);
  const fabBottom = stackBottom + 12;
  const panelMaxHeight = Math.min(windowHeight * 0.62, 520);

  useEffect(() => {
    if (!open) return;
    void fetchDailyGreetingIfNeeded();
  }, [open, fetchDailyGreetingIfNeeded]);

  return (
    <>
      {!open && (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { bottom: fabBottom },
            pressed && styles.fabPressed,
          ]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('coachFabOpen', lang)}
        >
          <CoachAvatar coachName={coachName} size={FAB_SIZE - 6} />
          <View style={styles.fabRing} />
        </Pressable>
      )}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <SafeAreaProvider>
          <CoachChatModal
            lang={lang}
            coachName={coachName}
            fabBottom={fabBottom}
            panelMaxHeight={panelMaxHeight}
            onClose={() => setOpen(false)}
          />
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

function CoachChatModal({
  lang,
  coachName,
  fabBottom,
  panelMaxHeight,
  onClose,
}: {
  lang: ReturnType<typeof useLanguage>;
  coachName: string;
  fabBottom: number;
  panelMaxHeight: number;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = Math.min(panelMaxHeight, windowHeight - insets.top - fabBottom - FAB_SIZE - 16);

  return (
    <View style={styles.modalRoot}>
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View
        style={[
          styles.bubbleWrap,
          { bottom: fabBottom + FAB_SIZE - 4, height: maxHeight },
        ]}
      >
        <View style={styles.panel}>
          <CoachChat
            lang={lang}
            coachName={coachName}
            variant="floating"
            onClose={onClose}
          />
        </View>
        <View style={styles.tail} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: layout.screenPadding,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    zIndex: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  fabPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.96 }],
  },
  fabRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 17, 17, 0.28)',
  },
  bubbleWrap: {
    position: 'absolute',
    left: layout.screenPadding,
    right: layout.screenPadding,
  },
  panel: {
    flex: 1,
    borderRadius: layout.cardRadius + 4,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },
  tail: {
    position: 'absolute',
    right: 22,
    bottom: -10,
    width: 20,
    height: 20,
    backgroundColor: colors.background,
    borderRightWidth: layout.borderWidth,
    borderBottomWidth: layout.borderWidth,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
});
