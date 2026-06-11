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
  Image,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { ModalSafeArea } from '../ui/ModalSafeArea';
import type { ExerciseMeasurementType, Gear, MuscleGroup } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { MUSCLES, muscleGroupLabel } from '../../constants/muscles';
import { GEARS } from '../../constants/gears';
import { t } from '../../lib/i18n';
import { pickImageFromLibrary } from '../../lib/pickImage';
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
  const [measurementType, setMeasurementType] = useState<ExerciseMeasurementType>('weight');
  const [mediaUri, setMediaUri] = useState<string | undefined>();

  const reset = () => {
    setName('');
    setMuscleGroup('chest');
    setGear('Dumbbell');
    setMeasurementType('weight');
    setMediaUri(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const created = addCustom(name, muscleGroup, gear, {
      measurementType,
      mediaUri,
      mediaType: mediaUri ? 'image' : undefined,
    });
    onCreated(customToExerciseDef(created));
    handleClose();
  };

  const handlePickMedia = async () => {
    const picked = await pickImageFromLibrary();
    if (picked?.uri) setMediaUri(picked.uri);
  };

  const selectGear = (nextGear: Gear) => {
    setGear(nextGear);
    if (nextGear === 'Band' || nextGear === 'Nova') setMeasurementType('level');
    else if (measurementType === 'level') setMeasurementType('weight');
  };

  const measurementOptions: Array<{ id: ExerciseMeasurementType; label: string; desc: string }> = [
    {
      id: 'weight',
      label: lang === 'ko' ? '중량' : 'Weight',
      desc: lang === 'ko' ? 'lb/kg + reps' : 'lb/kg + reps',
    },
    {
      id: 'level',
      label: lang === 'ko' ? '레벨' : 'Level',
      desc: lang === 'ko' ? '밴드/Nova 단계 + reps' : 'Band/Nova level + reps',
    },
    {
      id: 'bodyweight',
      label: lang === 'ko' ? '맨몸' : 'Bodyweight',
      desc: lang === 'ko' ? '추가 중량 선택 가능' : 'Optional added load',
    },
    {
      id: 'repsOnly',
      label: lang === 'ko' ? '횟수만' : 'Reps only',
      desc: lang === 'ko' ? '반복 수 중심 기록' : 'Track reps only',
    },
  ];

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
                  onPress={() => selectGear(g.id)}
                >
                  <Text style={[styles.chipText, gear === g.id && styles.chipTextActive]}>
                    {g.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{lang === 'ko' ? '측정 방식' : 'Measurement'}</Text>
            <View style={styles.measureGrid}>
              {measurementOptions.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.measureCard,
                    measurementType === option.id && styles.measureCardActive,
                  ]}
                  onPress={() => setMeasurementType(option.id)}
                >
                  <Text
                    style={[
                      styles.measureTitle,
                      measurementType === option.id && styles.measureTitleActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.measureDesc,
                      measurementType === option.id && styles.measureDescActive,
                    ]}
                  >
                    {option.desc}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{lang === 'ko' ? '이미지 / GIF' : 'Image / GIF'}</Text>
            <Pressable style={styles.mediaPicker} onPress={handlePickMedia}>
              {mediaUri ? (
                <Image source={{ uri: mediaUri }} style={styles.mediaPreview} resizeMode="cover" />
              ) : (
                <View style={styles.mediaPlaceholder}>
                  <Icon name="image" size={24} color={colors.textMuted} />
                  <Text style={styles.mediaText}>
                    {lang === 'ko' ? '썸네일 이미지 선택' : 'Choose thumbnail image'}
                  </Text>
                </View>
              )}
            </Pressable>
            {mediaUri ? (
              <Pressable onPress={() => setMediaUri(undefined)} style={styles.removeMediaBtn}>
                <Text style={styles.removeMediaText}>{lang === 'ko' ? '이미지 제거' : 'Remove image'}</Text>
              </Pressable>
            ) : null}
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
  measureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measureCard: {
    width: '48%',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  measureCardActive: {
    borderColor: colors.textPrimary,
    backgroundColor: colors.textPrimary,
  },
  measureTitle: {
    ...typography.listItem,
    fontSize: 14,
  },
  measureTitleActive: {
    color: colors.background,
  },
  measureDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 3,
  },
  measureDescActive: {
    color: colors.background,
    opacity: 0.78,
  },
  mediaPicker: {
    height: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  mediaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  removeMediaBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  removeMediaText: {
    ...typography.caption,
    color: colors.danger,
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
