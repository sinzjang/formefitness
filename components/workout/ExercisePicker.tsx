// 운동 추가 피커: 검색 + Gear / Target 필터 + 근육 그룹별 운동 카탈로그
import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SectionList,
  FlatList,
  StyleSheet,
  type ViewToken,
} from 'react-native';
import { Icon } from '../ui/Icon';
import { ModalSafeArea } from '../ui/ModalSafeArea';
import type { Gear, Language, MuscleGroup } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { MUSCLES, muscleGroupLabel } from '../../constants/muscles';
import { GEARS } from '../../constants/gears';
import { exerciseName, type ExerciseDef } from '../../constants/exercises';
import { localizeMuscleList, localizeMuscle } from '../../constants/anatomy';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { useCustomExerciseStore } from '../../stores/customExerciseStore';
import {
  filterExercises,
  getCatalogExercisesWithPrefs,
  getCustomExerciseDefs,
  getExerciseDbId,
} from '../../lib/exerciseCatalog';
import { filterActiveExercises } from '../../lib/exerciseMeta';
import { searchCatalogExercises } from '../../lib/exerciseSearch';
import { useExerciseCatalogPrefsStore } from '../../stores/exerciseCatalogPrefsStore';
import { AddCustomExerciseSheet } from './AddCustomExerciseSheet';
import { LazyExerciseDbThumb } from './LazyExerciseDbThumb';
import { LazyMuscleBodyView } from './LazyMuscleBodyView';
import { ExerciseDetailSheet } from './ExerciseDetailSheet';
import { seedCatalogMediaCache } from '../../lib/exerciseDbIdCache';
import { resetThumbLoadScheduler } from '../../lib/thumbLoadScheduler';
import { useDebouncedValue } from '../../lib/useDebouncedValue';

interface ExercisePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: ExerciseDef) => void;
}

type OpenFilter = 'gear' | 'target' | null;

type PickerSection = {
  key: string;
  title: string;
  muscleColor?: string;
  showAddCustom?: boolean;
  data: ExerciseDef[];
};

function exerciseRowKey(ex: ExerciseDef): string {
  if (ex.isCustom && ex.customId) return `custom:${ex.customId}`;
  return `ex:${ex.exerciseDbId ?? ex.nameEn}`;
}

const LIST_PERF = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 4,
  windowSize: 5,
  removeClippedSubviews: true,
};

const SCROLL_IDLE_MS = 180;
const VIEWABILITY_DEBOUNCE_MS = 100;

export function ExercisePicker({ visible, onClose, onSelect }: ExercisePickerProps) {
  const lang = useLanguage();
  const customExercises = useCustomExerciseStore((s) => s.exercises);
  const setCustomActive = useCustomExerciseStore((s) => s.setActive);
  const catalogPrefs = useExerciseCatalogPrefsStore((s) => s.prefs);
  const setCatalogActive = useExerciseCatalogPrefsStore((s) => s.setActive);
  const [gear, setGear] = useState<Gear | null>(null);
  const [target, setTarget] = useState<MuscleGroup | null>(null);
  const [open, setOpen] = useState<OpenFilter>(null);
  const [detail, setDetail] = useState<ExerciseDef | null>(null);
  const [customSheetVisible, setCustomSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleRowKeys, setVisibleRowKeys] = useState<Set<string>>(() => new Set());
  const [scrollIdle, setScrollIdle] = useState(true);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedVisibleRowKeys = useDebouncedValue(visibleRowKeys, VIEWABILITY_DEBOUNCE_MS);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      setOpen(null);
      setDetail(null);
      setVisibleRowKeys(new Set());
      setScrollIdle(true);
      if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
      resetThumbLoadScheduler();
    }
  }, [visible]);

  const fullCatalog = useMemo(() => {
    const items = getCatalogExercisesWithPrefs(catalogPrefs);
    seedCatalogMediaCache(
      items.map((ex) => ({
        nameEn: ex.nameEn,
        exerciseDbId: getExerciseDbId(ex),
        gifUrl: ex.gifUrl,
      }))
    );
    return items;
  }, [catalogPrefs]);

  const isSearching = searchQuery.trim().length > 0;

  const catalogItems = useMemo(
    () => filterExercises(filterActiveExercises(fullCatalog), gear, target),
    [fullCatalog, gear, target]
  );

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return filterExercises(
      searchCatalogExercises(fullCatalog, searchQuery, lang),
      gear,
      target
    );
  }, [fullCatalog, searchQuery, lang, gear, target, isSearching]);

  const customItems = useMemo(
    () => filterExercises(getCustomExerciseDefs(customExercises), gear, target),
    [customExercises, gear, target]
  );

  const visibleMuscles = useMemo(
    () => MUSCLES.filter((m) => !target || m.id === target),
    [target]
  );

  const sections = useMemo((): PickerSection[] => {
    const result: PickerSection[] = [
      {
        key: 'custom',
        title: t('exerciseCustom', lang),
        showAddCustom: true,
        data: customItems,
      },
    ];

    for (const muscle of visibleMuscles) {
      const items = catalogItems.filter((e) => e.muscleGroup === muscle.id);
      if (items.length === 0) continue;
      result.push({
        key: muscle.id,
        title: muscleGroupLabel(muscle.id, lang),
        muscleColor: muscle.color,
        data: items,
      });
    }

    return result;
  }, [catalogItems, customItems, visibleMuscles, lang]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const next = new Set(
        viewableItems
          .filter((token) => token.isViewable && token.key)
          .map((token) => token.key as string)
      );
      setVisibleRowKeys((prev) => {
        if (prev.size === next.size && [...prev].every((k) => next.has(k))) return prev;
        return next;
      });
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 20, minimumViewTime: 80 }).current;

  const handleScrollBegin = useCallback(() => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    setScrollIdle(false);
  }, []);

  const handleScrollEnd = useCallback(() => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    scrollIdleTimer.current = setTimeout(() => setScrollIdle(true), SCROLL_IDLE_MS);
  }, []);

  const listScrollHandlers = useMemo(
    () => ({
      onScrollBeginDrag: handleScrollBegin,
      onScrollEndDrag: handleScrollEnd,
      onMomentumScrollEnd: handleScrollEnd,
    }),
    [handleScrollBegin, handleScrollEnd]
  );

  const firstMuscleSectionKey = useMemo(
    () => sections.find((s) => s.muscleColor)?.key,
    [sections]
  );

  const handleDeactivate = (ex: ExerciseDef) => {
    if (ex.isCustom && ex.customId) {
      setCustomActive(ex.customId, false);
    } else {
      setCatalogActive(ex.nameEn, false);
    }
    setDetail(null);
  };

  // 운동 추가 후 피커 닫기
  const handleAdd = useCallback(
    (ex: ExerciseDef) => {
      onSelect(ex);
      setDetail(null);
      onClose();
    },
    [onSelect, onClose]
  );

  const gearLabel = gear ?? t('all', lang);
  const targetLabel = target ? muscleGroupLabel(target, lang) : t('all', lang);

  const toggle = (filter: OpenFilter) => setOpen((cur) => (cur === filter ? null : filter));

  const renderExerciseRow = useCallback(
    (ex: ExerciseDef, options?: { showCustomBadge?: boolean; showInactiveBadge?: boolean }) => {
      const loadKey = exerciseRowKey(ex);
      const thumbEligible = debouncedVisibleRowKeys.has(loadKey);
      return (
        <ExerciseListRow
          loadKey={loadKey}
          exercise={ex}
          lang={lang}
          thumbEligible={thumbEligible}
          scrollIdle={scrollIdle}
          showCustomBadge={options?.showCustomBadge}
          showInactiveBadge={options?.showInactiveBadge}
          onPressDetail={() => setDetail(ex)}
          onAdd={() => handleAdd(ex)}
        />
      );
    },
    [lang, debouncedVisibleRowKeys, scrollIdle, handleAdd]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ModalSafeArea>
          <View style={styles.header}>
            <Text style={styles.title}>{t('addExercise', lang)}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={26} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* 검색 — 전체 DB (is_active 무관) */}
          <View style={styles.searchBar}>
            <Icon name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('exerciseSearchPlaceholder', lang)}
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Icon name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* 필터 바: GEAR | TARGET */}
          <View style={styles.filterBar}>
            <Pressable style={styles.filterCol} onPress={() => toggle('gear')}>
              <Text style={styles.filterLabel}>{t('gear', lang)}</Text>
              <View style={styles.filterValueRow}>
                <Text style={styles.filterValue} numberOfLines={1}>
                  {gearLabel}
                </Text>
                <Icon
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
                <Icon
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

          {isSearching ? (
            <FlatList
              data={searchResults}
              keyExtractor={(ex) => exerciseRowKey(ex)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scroll}
              initialNumToRender={LIST_PERF.initialNumToRender}
              maxToRenderPerBatch={LIST_PERF.maxToRenderPerBatch}
              windowSize={LIST_PERF.windowSize}
              removeClippedSubviews={LIST_PERF.removeClippedSubviews}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              {...listScrollHandlers}
              ListHeaderComponent={
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('exerciseCatalog', lang)}</Text>
                  <Text style={styles.searchCount}>
                    {searchResults.length}
                    {t('exerciseSearchCountSuffix', lang)}
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <Text style={styles.emptyCustom}>{t('exerciseSearchEmpty', lang)}</Text>
              }
              renderItem={({ item: ex }) =>
                renderExerciseRow(ex, { showInactiveBadge: ex.is_active !== true })
              }
            />
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(ex) => exerciseRowKey(ex)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scroll}
              stickySectionHeadersEnabled={false}
              initialNumToRender={LIST_PERF.initialNumToRender}
              maxToRenderPerBatch={LIST_PERF.maxToRenderPerBatch}
              windowSize={LIST_PERF.windowSize}
              removeClippedSubviews={LIST_PERF.removeClippedSubviews}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              {...listScrollHandlers}
              renderSectionHeader={({ section }) => (
                <View style={styles.section}>
                  {section.key === firstMuscleSectionKey ? (
                    <View style={styles.catalogHeader}>
                      <Text style={styles.sectionTitle}>{t('exerciseCatalog', lang)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.sectionHeader}>
                    {section.muscleColor ? (
                      <View style={[styles.muscleDot, { backgroundColor: section.muscleColor }]} />
                    ) : null}
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    {section.showAddCustom ? (
                      <Pressable
                        style={styles.addCustomLink}
                        onPress={() => setCustomSheetVisible(true)}
                      >
                        <Icon name="add" size={16} color={colors.textPrimary} />
                        <Text style={styles.addCustomText}>{t('addCustomExercise', lang)}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )}
              renderSectionFooter={({ section }) =>
                section.key === 'custom' && section.data.length === 0 ? (
                  <Text style={styles.emptyCustom}>{t('customExerciseEmpty', lang)}</Text>
                ) : null
              }
              renderItem={({ item: ex, section }) =>
                renderExerciseRow(ex, {
                  showCustomBadge: section.key === 'custom',
                  showInactiveBadge: section.key !== 'custom' && ex.is_active !== true,
                })
              }
            />
          )}

          {/* 운동 요약 시트 — picker 안에서는 Modal 중첩 없이 오버레이 */}
          <ExerciseDetailSheet
            exercise={detail}
            lang={lang}
            presentation="overlay"
            onClose={() => setDetail(null)}
            onAdd={handleAdd}
            onDeactivate={detail ? () => handleDeactivate(detail) : undefined}
          />
          <AddCustomExerciseSheet
            visible={customSheetVisible}
            onClose={() => setCustomSheetVisible(false)}
            onCreated={(ex) => handleAdd(ex)}
          />
      </ModalSafeArea>
    </Modal>
  );
}

// 운동 목록 한 줄 — FORMÉ / MY EXERCISES 공통 레이아웃
const ExerciseListRow = memo(function ExerciseListRow({
  loadKey,
  exercise,
  lang,
  thumbEligible = false,
  scrollIdle = false,
  showCustomBadge = false,
  showInactiveBadge = false,
  onPressDetail,
  onAdd,
}: {
  loadKey: string;
  exercise: ExerciseDef;
  lang: Language;
  thumbEligible?: boolean;
  scrollIdle?: boolean;
  showCustomBadge?: boolean;
  showInactiveBadge?: boolean;
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
          <LazyExerciseDbThumb
            loadKey={loadKey}
            eligible={thumbEligible}
            nameEn={exercise.nameEn}
            exerciseDbId={getExerciseDbId(exercise)}
            gifUrl={exercise.gifUrl}
            variant="list"
          />
          <LazyMuscleBodyView
            loadKey={loadKey}
            eligible={thumbEligible}
            scrollIdle={scrollIdle}
            muscleKeys={exercise.primary}
            muscleGroup={exercise.muscleGroup}
          />
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
            {showInactiveBadge && (
              <Text style={styles.inactiveBadge}>{t('exerciseInactiveBadge', lang)}</Text>
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
        <Icon name="add" size={24} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
});

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
          <Icon name="image" size={18} color={colors.textMuted} />
        </View>
      )}
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      {selected && <Icon name="check" size={18} color={colors.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: layout.screenPadding,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    ...typography.listItem,
    fontSize: 15,
    paddingVertical: 0,
    color: colors.textPrimary,
  },
  searchCount: {
    ...typography.caption,
    marginLeft: 'auto',
    color: colors.textMuted,
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
  inactiveBadge: {
    ...typography.caption,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.textSecondary,
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
