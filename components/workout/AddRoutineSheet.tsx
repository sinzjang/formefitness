// 루틴 추가 시트: 이름 + 운동 목록 구성
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
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';
import type { RoutineExerciseEntry } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { exerciseLocalizedName, type ExerciseDef } from '../../constants/exercises';
import { resolveDisplayExerciseName } from '../../lib/exerciseKo';
import { getExerciseKey } from '../../lib/exerciseKey';
import { gearToResistance } from '../../constants/gears';
import { t } from '../../lib/i18n';
import { useLanguage, useSettingsStore } from '../../stores/settingsStore';
import { useRoutineStore } from '../../stores/routineStore';
import { ExercisePicker } from './ExercisePicker';

interface AddRoutineSheetProps {
  visible: boolean;
  locationId: string;
  onClose: () => void;
}

export function AddRoutineSheet({ visible, locationId, onClose }: AddRoutineSheetProps) {
  const lang = useLanguage();
  const defaultRest = useSettingsStore((s) => s.defaultRestSeconds);
  const addRoutine = useRoutineStore((s) => s.addRoutine);

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<RoutineExerciseEntry[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const reset = () => {
    setName('');
    setExercises([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAddExercise = (ex: ExerciseDef) => {
    const localized = exerciseLocalizedName(ex);
    const key = getExerciseKey(localized, ex.customId);
    if (exercises.some((e) => e.exerciseKey === key)) return;

    setExercises((prev) => [
      ...prev,
      {
        exerciseKey: key,
        exerciseName: localized,
        muscleGroup: ex.muscleGroup,
        resistanceType: gearToResistance(ex.gear),
        defaultRestSeconds: defaultRest,
        isCustom: ex.isCustom,
        customId: ex.customId,
      },
    ]);
  };

  const handleSave = () => {
    if (!name.trim() || exercises.length === 0) return;
    addRoutine(locationId, name, exercises);
    handleClose();
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
        <SafeAreaProvider>
          <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('addRoutine', lang)}</Text>
              <Pressable onPress={handleClose} hitSlop={8}>
                <Icon name="close" size={26} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
              <Text style={styles.label}>{t('routineName', lang)}</Text>
              <TextInput
                style={styles.input}
                placeholder={t('routineNamePlaceholder', lang)}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>{t('addExercise', lang)}</Text>
              {exercises.map((ex) => (
                <View key={ex.exerciseKey} style={styles.exerciseRow}>
                  <Text style={styles.exerciseName}>
                    {resolveDisplayExerciseName(ex.exerciseName, lang)}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setExercises((prev) => prev.filter((e) => e.exerciseKey !== ex.exerciseKey))
                    }
                    hitSlop={6}
                  >
                    <Icon name="close-circle" size={20} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}

              <Pressable style={styles.addExerciseBtn} onPress={() => setPickerVisible(true)}>
                <Icon name="add" size={18} color={colors.textPrimary} />
                <Text style={styles.addExerciseText}>{t('addExercise', lang)}</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={[styles.saveBtn, (!name.trim() || exercises.length === 0) && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!name.trim() || exercises.length === 0}
              >
                <Text style={styles.saveBtnText}>{t('save', lang)}</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>

      <ExercisePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleAddExercise}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
    marginTop: 8,
  },
  input: {
    ...typography.listItem,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  exerciseName: {
    ...typography.listItem,
    flex: 1,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addExerciseText: {
    ...typography.listItem,
    color: colors.textPrimary,
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
