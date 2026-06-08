// 운동 요약 바텀 시트: 상단 운동 GIF + 하단 근육 카드 (피커·세션 리스트 공통)
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../ui/Icon';
import type { Language, ResistanceType } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { muscleGroupLabel } from '../../constants/muscles';
import { gearToResistance } from '../../constants/gears';
import { exerciseName, type ExerciseDef } from '../../constants/exercises';
import { localizeMuscleList, localizeMuscle } from '../../constants/anatomy';
import { t, type StringKey } from '../../lib/i18n';
import { getExerciseDbId } from '../../lib/exerciseCatalog';
import { resolveExerciseInstructions } from '../../lib/exerciseDbIdCache';
import { MuscleBodyView } from './MuscleBodyView';
import { ExerciseDbThumb } from './ExerciseDbThumb';

const RESISTANCE_KEY: Record<ResistanceType, StringKey> = {
  weight: 'resistanceWeight',
  band: 'resistanceBand',
  bodyweight: 'resistanceBodyweight',
};
const resistanceLabel = (gear: ExerciseDef['gear'], lang: Language): string =>
  t(RESISTANCE_KEY[gearToResistance(gear)], lang);

export interface ExerciseDetailSheetProps {
  exercise: ExerciseDef | null;
  lang: Language;
  onClose: () => void;
  /** 미지정 시 하단 "운동 추가" 버튼 숨김 (세션 리스트 조회용) */
  onAdd?: (ex: ExerciseDef) => void;
  /** picker 내부: Modal 중첩 대신 View 오버레이 (닫기 즉시 반응) */
  presentation?: 'modal' | 'overlay';
  /** 리스트에서 숨김(is_active=false) 처리 */
  onDeactivate?: () => void;
}

export function ExerciseDetailSheet({
  exercise,
  lang,
  onClose,
  onAdd,
  presentation = 'modal',
  onDeactivate,
}: ExerciseDetailSheetProps) {
  const { width, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardGap = 8;
  const cardWidth = (width - layout.screenPadding * 2 - cardGap * 2) / 3;
  const heroWidth = width - layout.screenPadding * 2;
  // 상단 safe area 아래까지만 시트가 올라감
  const maxSheetHeight = windowHeight - insets.top - 8;
  const heroHeight = Math.min(heroWidth, maxSheetHeight * 0.42);

  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState<string[] | null>(null);
  const [instructionsLoading, setInstructionsLoading] = useState(false);

  const handleOpenInstructions = useCallback(() => {
    if (!exercise) return;
    setShowInstructions(true);
    setInstructionsLoading(true);
    void resolveExerciseInstructions(exercise.nameEn)
      .then((steps) => setInstructions(steps ?? []))
      .catch(() => setInstructions([]))
      .finally(() => setInstructionsLoading(false));
  }, [exercise]);

  const handleCloseInstructions = useCallback(() => {
    setShowInstructions(false);
  }, []);

  const handleDeactivatePress = useCallback(() => {
    if (!onDeactivate) return;
    Alert.alert(t('deactivateExercise', lang), t('deactivateExerciseConfirm', lang), [
      { text: t('cancel', lang), style: 'cancel' },
      {
        text: t('deactivate', lang),
        style: 'destructive',
        onPress: onDeactivate,
      },
    ]);
  }, [lang, onDeactivate]);

  useEffect(() => {
    setShowInstructions(false);
    setInstructions(null);
    setInstructionsLoading(false);
  }, [exercise?.nameEn]);

  const muscleCards = useMemo(() => {
    if (!exercise) return [];
    const synergists = exercise.synergist ?? [];
    return [
      {
        role: 'primary' as const,
        muscleKey: undefined,
        muscleKeys: exercise.primary,
        label: t('primary', lang),
        name: exercise.primary.length
          ? localizeMuscleList(exercise.primary, lang)
          : muscleGroupLabel(exercise.muscleGroup, lang),
        empty: false,
      },
      {
        role: 'synergist' as const,
        muscleKey: synergists[0],
        muscleKeys: [],
        label: t('synergist', lang),
        name: synergists[0] ? localizeMuscle(synergists[0], lang) : '-',
        empty: !synergists[0],
      },
      {
        role: 'synergist' as const,
        muscleKey: synergists[1],
        muscleKeys: [],
        label: t('synergist', lang),
        name: synergists[1] ? localizeMuscle(synergists[1], lang) : '-',
        empty: !synergists[1],
      },
    ];
  }, [exercise, lang]);

  if (!exercise) return null;

  const sheetContent = (
    <Pressable style={styles.sheetOverlay} onPress={onClose}>
      <Pressable
        style={[styles.sheet, { maxHeight: maxSheetHeight, paddingBottom: insets.bottom + 16 }]}
        onPress={() => {}}
      >
        {/* 상단 바 — 스크롤 밖 고정 (X·휴지통 항상 터치 가능) */}
        <View style={styles.sheetTopBar}>
          <View style={styles.sheetHandle} />
          {onDeactivate && exercise.is_active !== false && (
            <Pressable
              style={({ pressed }) => [styles.sheetTrashBtn, pressed && styles.sheetTrashBtnPressed]}
              onPress={handleDeactivatePress}
              hitSlop={8}
              accessibilityLabel={t('deactivateExercise', lang)}
            >
              <Icon name="trash" size={22} color={colors.danger} />
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.sheetCloseBtn, pressed && styles.sheetCloseBtnPressed]}
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel="닫기"
          >
            <Icon name="close" size={26} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
          bounces
          nestedScrollEnabled
        >
          <View style={[styles.sheetHeroImage, { height: heroHeight }]}>
            <ExerciseDbThumb
              nameEn={exercise.nameEn}
              exerciseDbId={getExerciseDbId(exercise)}
              gifUrl={exercise.gifUrl}
              variant="hero"
              width={heroWidth}
              height={heroHeight}
              borderRadius={12}
            />
            <Pressable
              style={({ pressed }) => [styles.heroInfoBtn, pressed && styles.heroInfoBtnPressed]}
              onPress={handleOpenInstructions}
              hitSlop={6}
              accessibilityLabel={t('exerciseInstructions', lang)}
            >
              <Icon name="info" size={28} color={colors.textPrimary} />
            </Pressable>
          </View>

          <Text style={styles.sheetTitle}>{exerciseName(exercise, lang)}</Text>

          <View style={styles.sheetMetaRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{muscleGroupLabel(exercise.muscleGroup, lang)}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{exercise.gear}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{resistanceLabel(exercise.gear, lang)}</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.muscleCardRow}
            snapToInterval={cardWidth + cardGap}
            decelerationRate="fast"
            nestedScrollEnabled
          >
            {muscleCards.map((card, index) => (
              <View key={`${card.role}-${index}`} style={[styles.muscleCard, { width: cardWidth }]}>
                <Text style={styles.muscleCardRole}>{card.label}</Text>
                <View style={styles.muscleCardBody}>
                  {card.role === 'primary' ? (
                    <MuscleBodyView
                      size="card"
                      fill
                      muscleKeys={card.muscleKeys}
                      muscleGroup={exercise.muscleGroup}
                    />
                  ) : (
                    <MuscleBodyView
                      size="card"
                      fill
                      muscleKey={card.muscleKey}
                      muscleGroup={exercise.muscleGroup}
                      empty={card.empty}
                    />
                  )}
                </View>
                <Text style={styles.muscleCardName} numberOfLines={2}>
                  {card.name}
                </Text>
              </View>
            ))}
          </ScrollView>

          {onAdd && (
            <Pressable
              style={({ pressed }) => [styles.sheetAdd, pressed && styles.sheetAddPressed]}
              onPress={() => onAdd(exercise)}
            >
              <Icon name="add" size={20} color={colors.background} />
              <Text style={styles.sheetAddText}>{t('addExercise', lang)}</Text>
            </Pressable>
          )}
        </ScrollView>

        <Modal
          visible={showInstructions}
          transparent
          animationType="fade"
          onRequestClose={handleCloseInstructions}
        >
          <Pressable style={styles.instructionsOverlay} onPress={handleCloseInstructions}>
            <Pressable style={styles.instructionsCard} onPress={() => {}}>
              <View style={styles.instructionsHeader}>
                <Text style={styles.instructionsTitle}>{t('exerciseInstructions', lang)}</Text>
                <Pressable onPress={handleCloseInstructions} hitSlop={8}>
                  <Icon name="close" size={24} color={colors.textPrimary} />
                </Pressable>
              </View>
              {instructionsLoading ? (
                <ActivityIndicator style={styles.instructionsLoader} color={colors.textPrimary} />
              ) : (
                <ScrollView style={styles.instructionsScroll} showsVerticalScrollIndicator={false}>
                  {instructions && instructions.length > 0 ? (
                    instructions.map((step, index) => (
                      <View key={index} style={styles.instructionRow}>
                        <Text style={styles.instructionNum}>{index + 1}</Text>
                        <Text style={styles.instructionText}>{step}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.instructionsEmpty}>{t('instructionsEmpty', lang)}</Text>
                  )}
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </Pressable>
    </Pressable>
  );

  if (presentation === 'overlay') {
    return <View style={styles.overlayRoot}>{sheetContent}</View>;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {sheetContent}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 10,
    overflow: 'hidden',
  },
  sheetScroll: {
    flexShrink: 1,
    minHeight: 0,
  },
  sheetScrollContent: {
    paddingBottom: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  sheetTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    minHeight: 32,
  },
  sheetCloseBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTrashBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTrashBtnPressed: {
    opacity: 0.5,
  },
  sheetCloseBtnPressed: {
    opacity: 0.5,
  },
  sheetHeroImage: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroInfoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfoBtnPressed: {
    opacity: 0.7,
  },
  instructionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
  },
  instructionsCard: {
    maxHeight: '70%',
    backgroundColor: colors.background,
    borderRadius: layout.cardRadius,
    padding: 16,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  instructionsTitle: {
    ...typography.listItem,
    fontSize: 17,
  },
  instructionsScroll: {
    maxHeight: 360,
  },
  instructionsLoader: {
    marginVertical: 24,
  },
  instructionsEmpty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  instructionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  instructionNum: {
    ...typography.caption,
    color: colors.textMuted,
    width: 20,
    textAlign: 'right',
  },
  instructionText: {
    ...typography.body,
    flex: 1,
    lineHeight: 22,
  },
  muscleCardRow: {
    gap: 8,
    paddingVertical: 16,
  },
  muscleCard: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardRadius,
    padding: 8,
    alignItems: 'center',
  },
  muscleCardRole: {
    ...typography.caption,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  muscleCardBody: {
    height: 120,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  muscleCardName: {
    ...typography.caption,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 6,
    minHeight: 28,
  },
  sheetTitle: {
    ...typography.sectionHeader,
    fontSize: 20,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  sheetAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  sheetAddPressed: {
    opacity: 0.85,
  },
  sheetAddText: {
    ...typography.button,
    color: colors.background,
  },
});
