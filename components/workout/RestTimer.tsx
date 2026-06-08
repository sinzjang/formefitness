// 휴식 타이머 오버레이: 세트 완료 후 하단 카운트다운
import { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, layout, fonts } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { alertRestComplete } from '../../lib/restAlert';
import { useLanguage, useSettingsStore } from '../../stores/settingsStore';
import { useRestTimerStore } from '../../stores/restTimerStore';

// 초 → MM:SS
const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function RestTimer() {
  const lang = useLanguage();
  const active = useRestTimerStore((s) => s.active);
  const exerciseName = useRestTimerStore((s) => s.exerciseName);
  const secondsLeft = useRestTimerStore((s) => s.secondsLeft);
  const totalSeconds = useRestTimerStore((s) => s.totalSeconds);
  const isPaused = useRestTimerStore((s) => s.isPaused);
  const tick = useRestTimerStore((s) => s.tick);
  const skip = useRestTimerStore((s) => s.skip);
  const addTime = useRestTimerStore((s) => s.addTime);
  const togglePause = useRestTimerStore((s) => s.togglePause);
  const shouldAlert = useRestTimerStore((s) => s.shouldAlert);
  const clearAlert = useRestTimerStore((s) => s.clearAlert);
  const restAlertsEnabled = useSettingsStore((s) => s.restAlertsEnabled);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 1초마다 tick
  useEffect(() => {
    if (!active || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => tick(), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active, isPaused, tick]);

  // 타이머 자연 종료 시 햅틱 + 진동
  useEffect(() => {
    if (!shouldAlert) return;
    if (restAlertsEnabled) {
      void alertRestComplete();
    }
    clearAlert();
  }, [shouldAlert, restAlertsEnabled, clearAlert]);

  if (!active || !exerciseName) return null;

  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const name = exerciseName[lang];

  return (
    <View style={styles.container}>
      {/* 진행 바 */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={styles.label}>{t('rest', lang)}</Text>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {name}
          </Text>
        </View>

        <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>

        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={() => addTime(15)} hitSlop={4}>
            <Text style={styles.actionText}>{t('add15s', lang)}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={togglePause} hitSlop={4}>
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={16}
              color={colors.textPrimary}
            />
          </Pressable>

          <Pressable style={styles.skipBtn} onPress={skip} hitSlop={4}>
            <Text style={styles.skipText}>{t('skipRest', lang)}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.textPrimary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 14,
    gap: 12,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  exerciseName: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.background,
    marginTop: 2,
  },
  timer: {
    fontFamily: fonts.bold700,
    fontSize: 32,
    color: colors.background,
    fontVariant: ['tabular-nums'],
    minWidth: 72,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.background,
    fontSize: 10,
  },
  skipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipText: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.background,
  },
});
