// 커스텀 운동 추가 시트
import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { ModalSafeArea } from '../ui/ModalSafeArea';
import type { Gear, MuscleGroup } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { MUSCLES, muscleGroupLabel } from '../../constants/muscles';
import { GEARS } from '../../constants/gears';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { useCustomExerciseStore } from '../../stores/customExerciseStore';
import { customToExerciseDef } from '../../lib/exerciseCatalog';
import type { ExerciseDef } from '../../constants/exercises';

interface AddCustomExerciseSheetProps {
  visible: boolean;
  onClose: () => void;
  onCreated: (exercise: ExerciseDef) => void;
}

export function AddCustomExerciseSheet({ visible, onClose, onCreated }: AddCustomExerciseSheetProps) {
  const lang = useLanguage();
  const addCustom = useCustomExerciseStore((s) => s.addExercise);

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('chest');
  const [gear, setGear] = useState<Gear>('Dumbbell');

  const reset = () => {
    setName('');
    setMuscleGroup('chest');
    setGear('Dumbbell');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const created = addCustom(name, muscleGroup, gear);
    onCreated(customToExerciseDef(created));
    handleClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <ModalSafeArea>
          <View style={styles.header}>
            <Text style={styles.title}>{t('addCustomExercise', lang)}</Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <Icon name="close" size={26} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.label}>{t('customExerciseName', lang)}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('customExerciseNamePlaceholder', lang)}
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            <Text style={styles.label}>{t('target', lang)}</Text>
            <View style={styles.chipRow}>
              {MUSCLES.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.chip, muscleGroup === m.id && styles.chipActive]}
                  onPress={() => setMuscleGroup(m.id)}
                >
                  <Text style={[styles.chipText, muscleGroup === m.id && styles.chipTextActive]}>
                    {muscleGroupLabel(m.id, lang)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('gear', lang)}</Text>
            <View style={styles.chipRow}>
              {GEARS.map((g) => (
                <Pressable
                  key={g.id}
                  style={[styles.chip, gear === g.id && styles.chipActive]}
                  onPress={() => setGear(g.id)}
                >
                  <Text style={[styles.chipText, gear === g.id && styles.chipTextActive]}>
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.saveBtn, !name.trim() && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={styles.saveBtnText}>{t('save', lang)}</Text>
            </Pressable>
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
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.sectionHeader,
  },
  scroll: {
    padding: layout.screenPadding,
    paddingBottom: 40,
  },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    ...typography.listItem,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.textPrimary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.background,
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.textPrimary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  saveBtnText: {
    ...typography.button,
    color: colors.background,
    textTransform: 'none',
  },
});
