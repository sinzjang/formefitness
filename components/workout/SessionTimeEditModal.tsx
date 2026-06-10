// 저장된 세션 — 시작·종료 시각 수정
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import { Icon } from '../ui/Icon';
import { ModalSafeArea } from '../ui/ModalSafeArea';
import { useHistoryStore } from '../../stores/historyStore';
import {
  combineLocalDateTime,
  sessionDurationSeconds,
  toLocalDateInput,
  toLocalTimeInput,
} from '../../lib/sessionDateTime';
import { formatSessionTime } from '../../lib/sessionTime';

interface SessionTimeEditModalProps {
  visible: boolean;
  sessionId: string | null;
  lang: Language;
  onClose: () => void;
}

export function SessionTimeEditModal({
  visible,
  sessionId,
  lang,
  onClose,
}: SessionTimeEditModalProps) {
  const session = useHistoryStore((s) =>
    sessionId ? s.sessions.find((x) => x.id === sessionId) : undefined
  );
  const updateSessionTimes = useHistoryStore((s) => s.updateSessionTimes);

  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (!visible || !session) return;
    const started = session.startedAt ?? session.endedAt;
    setStartDate(toLocalDateInput(started));
    setStartTime(toLocalTimeInput(started));
    setEndDate(toLocalDateInput(session.endedAt));
    setEndTime(toLocalTimeInput(session.endedAt));
  }, [visible, session]);

  const durationLabel = useMemo(() => {
    const start = combineLocalDateTime(startDate, startTime);
    const end = combineLocalDateTime(endDate, endTime);
    if (!start || !end) return '—';
    if (end.getTime() <= start.getTime()) return '—';
    return formatSessionTime(sessionDurationSeconds(start.toISOString(), end.toISOString()));
  }, [startDate, startTime, endDate, endTime]);

  const handleSave = () => {
    if (!sessionId) return;
    const start = combineLocalDateTime(startDate, startTime);
    const end = combineLocalDateTime(endDate, endTime);

    if (!start || !end) {
      Alert.alert(t('sessionTimeEdit', lang), t('sessionTimeInvalidFormat', lang));
      return;
    }
    if (end.getTime() <= start.getTime()) {
      Alert.alert(t('sessionTimeEdit', lang), t('sessionTimeInvalidOrder', lang));
      return;
    }

    updateSessionTimes(sessionId, start.toISOString(), end.toISOString());
    onClose();
  };

  if (!session) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Icon name="close" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('sessionTimeEdit', lang)}</Text>
          <Pressable onPress={handleSave} hitSlop={8}>
            <Text style={styles.saveText}>{t('save', lang)}</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.hint}>{t('sessionTimeEditHint', lang)}</Text>

          <Text style={styles.sectionLabel}>{t('sessionStartedAt', lang)}</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:mm"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.sectionLabel}>{t('sessionEndedAt', lang)}</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.dateInput]}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="HH:mm"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.durationBox}>
            <Text style={styles.durationLabel}>{t('sessionDuration', lang)}</Text>
            <Text style={styles.durationValue}>{durationLabel}</Text>
          </View>
        </View>
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.listItem,
    fontSize: 16,
  },
  saveText: {
    ...typography.listItem,
    fontSize: 15,
    color: colors.accent,
  },
  body: {
    padding: layout.screenPadding,
    gap: 8,
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  sectionLabel: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    fontVariant: ['tabular-nums'],
  },
  dateInput: {
    flex: 1.4,
  },
  timeInput: {
    flex: 1,
  },
  durationBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: layout.cardRadius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationValue: {
    ...typography.listItem,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
});
