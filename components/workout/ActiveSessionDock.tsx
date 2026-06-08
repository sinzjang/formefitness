// 진행 중 세션 — 하단 탭바 위 고정 미니 바
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, layout, fonts } from '../../constants/theme';
import { formatSessionTime } from '../../lib/sessionTime';
import { t } from '../../lib/i18n';
import { useSessionElapsed } from '../../hooks/useSessionElapsed';
import { useLanguage } from '../../stores/settingsStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { useRestTimerStore } from '../../stores/restTimerStore';

export const SESSION_DOCK_HEIGHT = 44;

export function ActiveSessionDock() {
  const lang = useLanguage();
  const router = useRouter();
  const segments = useSegments();

  const session = useWorkoutStore((s) => s.session);
  const sessionScreenOpen = useWorkoutStore((s) => s.sessionScreenOpen);
  const openSessionScreen = useWorkoutStore((s) => s.openSessionScreen);

  const restActive = useRestTimerStore((s) => s.active);
  const secondsLeft = useRestTimerStore((s) => s.secondsLeft);

  const elapsedSeconds = useSessionElapsed();

  const isRunning = Boolean(session?.runningStartedAt);
  const onWorkoutSessionView =
    (segments as string[]).includes('workout') && sessionScreenOpen;

  const title = useMemo(() => {
    if (restActive) return t('sessionRest', lang);
    const current =
      session?.exercises.find((ex) => ex.sets.some((s) => !s.completed)) ??
      session?.exercises[session.exercises.length - 1];
    return current?.exerciseName[lang] ?? t('workout', lang);
  }, [restActive, session?.exercises, session, lang]);

  if (!isRunning || onWorkoutSessionView) return null;

  const restDisplay = restActive ? formatSessionTime(secondsLeft) : '00:00';

  const handlePress = () => {
    openSessionScreen();
    router.push('/(tabs)/workout');
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
      accessibilityLabel={t('tapToResume', lang)}
    >
      <Ionicons name="barbell-outline" size={16} color={colors.accent} />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.times}>
        <Text style={styles.time}>{formatSessionTime(elapsedSeconds)}</Text>
        <Text style={styles.sep}>—</Text>
        <Text style={[styles.time, restActive && styles.timeActive]}>{restDisplay}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SESSION_DOCK_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: layout.screenPadding,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    flex: 1,
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
  },
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontFamily: fonts.bold700,
    fontSize: 13,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  timeActive: {
    color: colors.accent,
  },
  sep: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
});
