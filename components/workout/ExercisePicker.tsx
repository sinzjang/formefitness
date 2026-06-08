// 운동 추가 피커: Gear / Target 필터 + 근육 그룹별 운동 카탈로그
import { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Gear, Language, MuscleGroup } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { MUSCLES, muscleGroupLabel } from '../../constants/muscles';
import { GEARS } from '../../constants/gears';
import { exercisesByMuscle, exerciseName, type ExerciseDef } from '../../constants/exercises';
import { localizeMuscleList, localizeMuscle } from '../../constants/anatomy';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { useCustomExerciseStore } from '../../stores/customExerciseStore';
import {
  filterExercises,
  getCatalogExercises,
  getCustomExerciseDefs,
  getExerciseDbId,
} from '../../lib/exerciseCatalog';
import { AddCustomExerciseSheet } from './AddCustomExerciseSheet';
import { MuscleBodyView } from './MuscleBodyView';
import { ExerciseDbThumb } from './ExerciseDbThumb';
import { ExerciseDetailSheet } from './ExerciseDetailSheet';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseDef) => void;
}

type OpenFilter = 'gear' | 'target' | null;

export function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const lang = useLanguage();
  const customExercises = useCustomExerciseStore((s) => s.exercises);
  const [gear, setGear] = useState<Gear | null>(null);
  const [target, setTarget] = useState<MuscleGroup | null>(null);
  const [open, setOpen] = useState<OpenFilter>(null);
  const [detail, setDetail] = useState<ExerciseDef | null>(null);
  const [customSheetVisible, setCustomSheetVisible] = useState(false);

  const catalogItems = useMemo(
    () => filterExercises(getCatalogExercises(), gear, target),
    [gear, target]
  );
  const customItems = useMemo(
    () => filterExercises(getCustomExerciseDefs(customExercises), gear, target),
    [customExercises, gear, target]
  );

  // 운동 추가 후 피커 닫기
  const handleAdd = (ex: ExerciseDef) => {
    onSelect(ex);
    setDetail(null);
    onClose();
  };

  const gearLabel = gear ?? t('all', lang);
  const targetLabel = target ? muscleGroupLabel(target, lang) : t('all', lang);

  const toggle = (filter: OpenFilter) => setOpen((cur) => (cur === filter ? null : filter));

  const visibleMuscles = MUSCLES.filter((m) => !target || m.id === target);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Modal은 별도 뷰 계층이라 SafeAreaProvider를 다시 감싸야 인셋이 적용됨 */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('addExercise', lang)}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={26} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* 필터 바: GEAR | TARGET */}
          <View style={styles.filterBar}>
            <Pressable style={styles.filterCol} onPress={() => toggle('gear')}>
              <Text style={styles.filterLabel}>{t('gear', lang)}</Text>
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue} numberOfLines={1}>
                  {gearLabel}
                </Text>
                <Ionicons
                  name={open === 'gear' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            <View style={styles.filterDivider} />

            <Pressable style={styles.filterCol} onPress={() => toggle('target')}>
              <Text style={styles.filterLabel}>{t('target', lang)}</Text>
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue} numberOfLines={1}>
                  {targetLabel}
                </Text>
                <Ionicons
                  name={open === 'target' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>
          </View>

          {/* 옵션 드롭다운 (위아래 슬라이드 선택) */}
          {open === 'gear' && (
            <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled">
              <OptionRow
                label={t('all', lang)}
                selected={gear === null}
                onPress={() => {
                  setGear(null);
                  setOpen(null);
                }}
              />
              {GEARS.map((g) => (
                <OptionRow
                  key={g.id}
                  label={g.label}
                  thumb
                  selected={gear === g.id}
                  onPress={() => {
                    setGear(g.id);
                    setOpen(null);
                  }}
                />
              ))}
            </ScrollView>
          )}

          {open === 'target' && (
            <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled">
              <OptionRow
                label={t('all', lang)}
                selected={target === null}
                onPress={() => {
                  setTarget(null);
                  setOpen(null);
                }}
              />
              {MUSCLES.map((m) => (
                <OptionRow
                  key={m.id}
                  label={muscleGroupLabel(m.id, lang)}
                  thumb
                  selected={target === m.id}
                  onPress={() => {
                    setTarget(m.id);
                    setOpen(null);
                  }}
                />
              ))}
            </ScrollView>
          )}

          <ScrollView contentContainerStyle={styles.scroll}>
            {/* MY EXERCISES — 커스텀 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('exerciseCustom', lang)}</Text>
                <Pressable
                  style={styles.addCustomLink}
                  onPress={() => setCustomSheetVisible(true)}
                >
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                  <Text style={styles.addCustomText}>{t('addCustomExercise', lang)}</Text>
                </Pressable>
              </View>

              {customItems.length === 0 ? (
                <Text style={styles.emptyCustom}>{t('customExerciseEmpty', lang)}</Text>
              ) : (
                customItems.map((ex) => (
                  <ExerciseListRow
                    key={ex.customId ?? ex.name}
                    exercise={ex}
                    lang={lang}
                    showCustomBadge
                    onPressDetail={() => setDetail(ex)}
                    onAdd={() => handleAdd(ex)}
                  />
                ))
              )}
            </View>

            {/* FORMÉ — 내장 카탈로그 */}
            <View style={styles.catalogHeader}>
              <Text style={styles.sectionTitle}>{t('exerciseCatalog', lang)}</Text>
            </View>

            {visibleMuscles.map((muscle) => {
              const items = catalogItems.filter((e) => e.muscleGroup === muscle.id);
              if (items.length === 0) return null;
              return (
                <View key={muscle.id} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.muscleDot, { backgroundColor: muscle.color }]} />
                    <Text style={styles.sectionTitle}>{muscleGroupLabel(muscle.id, lang)}</Text>
                  </View>

                  {items.map((ex) => (
                    <ExerciseListRow
                      key={ex.exerciseDbId ?? ex.nameEn}
                      exercise={ex}
                      lang={lang}
                      onPressDetail={() => setDetail(ex)}
                      onAdd={() => handleAdd(ex)}
                    />
                  ))}
                </View>
              );
            })}
          </ScrollView>

          {/* 운동 요약 시트 (하단에서 슬라이드 업) */}
          <ExerciseDetailSheet
            exercise={detail}
            lang={lang}
            onClose={() => setDetail(null)}
            onAdd={handleAdd}
          />
          <AddCustomExerciseSheet
            visible={customSheetVisible}
            onClose={() => setCustomSheetVisible(false)}
            onCreated={(ex) => handleAdd(ex)}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

// 운동 목록 한 줄 — FORMÉ / MY EXERCISES 공통 레이아웃
function ExerciseListRow({
  exercise,
  lang,
  showCustomBadge = false,
  onPressDetail,
  onAdd,
}: {
  exercise: ExerciseDef;
  lang: Language;
  showCustomBadge?: boolean;
  onPressDetail: () => void;
  onAdd: () => void;
}) {
  // 커스텀: primary/synergist 없음 → 타겟 부위를 주동근으로 표시
  const primaryText =
    exercise.primary.length > 0
      ? localizeMuscleList(exercise.primary, lang)
      : muscleGroupLabel(exercise.muscleGroup, lang);
  const synergistText =
    exercise.synergist.length > 0 ? localizeMuscleList(exercise.synergist, lang) : '-';

  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.rowMain, pressed && styles.rowPressed]}
        onPress={onPressDetail}
      >
        <View style={styles.imagePair}>
          <ExerciseDbThumb
            nameEn={exercise.nameEn}
            exerciseDbId={getExerciseDbId(exercise)}
            gifUrl={exercise.gifUrl}
            variant="list"
          />
          <MuscleBodyView muscleKeys={exercise.primary} muscleGroup={exercise.muscleGroup} />
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.rowTextCol}>
          <View style={styles.titleRow}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {exerciseName(exercise, lang)}
            </Text>
            {showCustomBadge && (
              <Text style={styles.customBadge}>{t('customBadge', lang)}</Text>
            )}
          </View>
          <Text style={styles.rowMuscle} numberOfLines={2}>
            <Text style={styles.muscleLabel}>{t('primary', lang)} </Text>
            {primaryText}
            <Text style={styles.muscleSep}> | </Text>
            <Text style={styles.muscleLabel}>{t('synergist', lang)} </Text>
            {synergistText}
            <Text style={styles.muscleSep}> | </Text>
            <Text style={styles.muscleLabel}>{t('gear', lang)} </Text>
            {exercise.gear}
          </Text>
        </View>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        onPress={onAdd}
        hitSlop={6}
      >
        <Ionicons name="add" size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

// 드롭다운 옵션 한 줄 (이미지 플레이스홀더 / 색 도트 / 체크)
function OptionRow({
  label,
  thumb,
  selected,
  onPress,
}: {
  label: string;
  thumb?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.optionRow, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      {/* 왼쪽: 이미지 플레이스홀더 (Gear=기구, Target=부위 이미지 자리) */}
      {thumb && (
        <View style={styles.optionThumb}>
          <Ionicons name="image-outline" size={18} color={colors.textMuted} />
        </View>
      )}
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={18} color={colors.accent} />}
    </Pressable>
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
  },
  title: {
    ...typography.sectionHeader,
  },
  // 필터 바
  filterBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.border,
  },
  filterCol: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
  },
  filterDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  filterLabel: {
    ...typography.caption,
    letterSpacing: 1,
    color: colors.textMuted,
  },
  filterValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  filterValue: {
    ...typography.listItem,
    flex: 1,
  },
  // 드롭다운
  dropdown: {
    maxHeight: 280,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  optionThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    ...typography.listItem,
    flex: 1,
  },
  optionLabelSelected: {
    color: colors.accent,
  },
  // 목록
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  addCustomLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  addCustomText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  catalogHeader: {
    marginTop: 24,
    marginBottom: 8,
  },
  emptyCustom: {
    ...typography.body,
    paddingVertical: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  customBadge: {
    ...typography.caption,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.textMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  muscleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  imagePair: {
    flexDirection: 'row',
    gap: 4,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowDivider: {
    width: StyleSheet.hairlineWidth,
    height: 52,
    backgroundColor: colors.border,
  },
  // 타이틀(위) + main|sub(아래) 세로 배치
  rowTextCol: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    ...typography.listItem,
    fontSize: 17,
  },
  rowMuscle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  muscleLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  muscleSep: {
    ...typography.caption,
    color: colors.border,
  },
  // + 추가 버튼
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  addBtnPressed: {
    backgroundColor: colors.surface,
  },
});
