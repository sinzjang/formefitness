// 세션 상단 타이머 — WORKOUT | REST + 각각 컨트롤, 휴식 ±15초
import { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, layout, fonts } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { formatSessionMonthDay } from '../../lib/dates';
import { formatSessionTime } from '../../lib/sessionTime';
import { alertRestComplete } from '../../lib/restAlert';
import { useSessionElapsed } from '../../hooks/useSessionElapsed';
import { useLanguage, useSettingsStore } from '../../stores/settingsStore';
import { useRestTimerStore } from '../../stores/restTimerStore';
import { useWorkoutStore } from '../../stores/workoutStore';

interface SessionTimerBarProps {
  onEndSession: () => void;
}

function TimerIconBtn({
  icon,
  label,
  onPress,
  disabled,
  variant = 'default',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'stop';
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.iconBtn,
        variant === 'stop' && styles.iconBtnStop,
        disabled && styles.iconBtnDisabled,
        pressed && !disabled && styles.iconBtnPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      accessibilityLabel={label}
    >
      <Ionicons
        name={icon}
        size={variant === 'stop' ? 14 : 16}
        color={variant === 'stop' ? colors.background : colors.textPrimary}
      />
    </Pressable>
  );
}

export function SessionTimerBar({ onEndSession }: SessionTimerBarProps) {
  const lang = useLanguage();
  const elapsedSeconds = useSessionElapsed();

  const session = useWorkoutStore((s) => s.session);
  const sessionPaused = useWorkoutStore((s) => s.sessionPaused);
  const toggleSessionPause = useWorkoutStore((s) => s.toggleSessionPause);

  const { monthLabel, dayLabel } = useMemo(() => {
    const iso = session?.runningStartedAt ?? session?.startedAt;
    const date = iso ? new Date(iso) : new Date();
    return formatSessionMonthDay(date, lang);
  }, [session?.runningStartedAt, session?.startedAt, lang]);

  const restActive = useRestTimerStore((s) => s.active);
  const secondsLeft = useRestTimerStore((s) => s.secondsLeft);
  const restPaused = useRestTimerStore((s) => s.isPaused);
  const tick = useRestTimerStore((s) => s.tick);
  const skipRest = useRestTimerStore((s) => s.skip);
  const addTime = useRestTimerStore((s) => s.addTime);
  const restartRest = useRestTimerStore((s) => s.restartRest);
  const toggleRestPause = useRestTimerStore((s) => s.togglePause);
  const shouldAlert = useRestTimerStore((s) => s.shouldAlert);
  const clearAlert = useRestTimerStore((s) => s.clearAlert);
  const restAlertsEnabled = useSettingsStore((s) => s.restAlertsEnabled);

  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 휴식 카운트다운 — 세션 일시정지 시에도 멈춤
  useEffect(() => {
    if (!restActive || restPaused || sessionPaused) {
      if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
        restIntervalRef.current = null;
      }
      return;
    }

    restIntervalRef.current = setInterval(() => tick(), 1000);
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    };
  }, [restActive, restPaused, sessionPaused, tick]);

  useEffect(() => {
    if (!shouldAlert || sessionPaused) return;
    if (restAlertsEnabled) {
      void alertRestComplete();
    }
    clearAlert();
  }, [shouldAlert, restAlertsEnabled, clearAlert, sessionPaused]);

  const handleEndSession = () => {
    Alert.alert(t('endSession', lang), t('endSessionConfirm', lang), [
      { text: t('cancel', lang), style: 'cancel' },
      { text: t('end', lang), style: 'destructive', onPress: onEndSession },
    ]);
  };

  const restDisplay = restActive ? formatSessionTime(secondsLeft) : '00:00';

  return (
    <View style={styles.container}>
      {/* 맨 왼쪽: 세션 날짜 (월 / 일) */}
      <View style={styles.dateCol}>
        <View style={styles.dateBox}>
          <Text style={styles.dateText}>{monthLabel}</Text>
        </View>
        <View style={styles.dateBox}>
          <Text style={styles.dateText}>{dayLabel}</Text>
        </View>
      </View>

      <View style={styles.columns}>
        {/* WORKOUT */}
        <View style={styles.block}>
          <Text style={styles.label}>{t('workout', lang)}</Text>
          <Text style={[styles.value, sessionPaused && styles.valuePaused]}>
            {formatSessionTime(elapsedSeconds)}
          </Text>
          <View style={styles.btnRow}>
            <TimerIconBtn
              icon={sessionPaused ? 'play' : 'pause'}
              label={sessionPaused ? t('sessionResume', lang) : t('sessionPause', lang)}
              onPress={toggleSessionPause}
            />
            <TimerIconBtn
              icon="stop"
              label={t('endSession', lang)}
              onPress={handleEndSession}
              variant="stop"
            />
          </View>
        </View>

        <View style={styles.divider} />

        {/* 오른쪽: REST */}
        <View style={styles.block}>
          <Text style={styles.label}>{t('sessionRest', lang)}</Text>
          <Text style={[styles.value, restActive && styles.valueActive]}>{restDisplay}</Text>
          <View style={styles.btnRow}>
            <TimerIconBtn
              icon={restPaused ? 'play' : 'pause'}
              label={restPaused ? t('resume', lang) : t('pause', lang)}
              onPress={toggleRestPause}
              disabled={!restActive}
            />
            <TimerIconBtn
              icon="refresh"
              label={t('resetRest', lang)}
              onPress={restartRest}
              disabled={!restActive}
            />
            <TimerIconBtn
              icon="stop"
              label={t('skipRest', lang)}
              onPress={skipRest}
              disabled={!restActive}
              variant="stop"
            />
          </View>
        </View>
      </View>

      {/* 맨 오른쪽: 휴식 ±15초 (+15 위, -15 아래) */}
      <View style={styles.adjustCol}>
        <Pressable
          style={({ pressed }) => [
            styles.adjustBtn,
            !restActive && styles.adjustBtnDisabled,
            pressed && restActive && styles.adjustBtnPressed,
          ]}
          onPress={() => addTime(15)}
          disabled={!restActive}
          hitSlop={4}
          accessibilityLabel={t('add15s', lang)}
        >
          <Text style={[styles.adjustText, !restActive && styles.adjustTextDisabled]}>
            {t('add15s', lang)}
          </Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.adjustBtn,
            !restActive && styles.adjustBtnDisabled,
            pressed && restActive && styles.adjustBtnPressed,
          ]}
          onPress={() => addTime(-15)}
          disabled={!restActive}
          hitSlop={4}
          accessibilityLabel={t('sub15s', lang)}
        >
          <Text style={[styles.adjustText, !restActive && styles.adjustTextDisabled]}>
            {t('sub15s', lang)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: layout.screenPadding,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.surface,
    gap: 10,
  },
  dateCol: {
    justifyContent: 'center',
    gap: 6,
    paddingRight: 4,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    minWidth: 52,
  },
  dateBox: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    minWidth: 44,
  },
  dateText: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
    fontSize: 10,
  },
  columns: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  block: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 10,
  },
  value: {
    fontFamily: fonts.bold700,
    fontSize: 22,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    minHeight: 28,
  },
  valuePaused: {
    color: colors.textSecondary,
  },
  valueActive: {
    color: colors.accent,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnStop: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.textPrimary,
  },
  iconBtnDisabled: {
    opacity: 0.35,
  },
  iconBtnPressed: {
    opacity: 0.6,
  },
  adjustCol: {
    justifyContent: 'center',
    gap: 6,
    paddingLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    minWidth: 52,
  },
  adjustBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  adjustBtnDisabled: {
    opacity: 0.35,
  },
  adjustBtnPressed: {
    opacity: 0.6,
  },
  adjustText: {
    ...typography.caption,
    fontFamily: typography.listItem.fontFamily,
    color: colors.textPrimary,
    fontSize: 10,
  },
  adjustTextDisabled: {
    color: colors.textMuted,
  },
});
