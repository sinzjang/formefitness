// 장소별 루틴 목록 + 하단 고정 Routine 버튼
import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Icon } from '../ui/Icon';
import type { WorkoutRoutine } from '../../types';
import { colors, typography, layout } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';
import { useRoutineStore } from '../../stores/routineStore';
import { AddRoutineSheet } from './AddRoutineSheet';

interface RoutineSectionProps {
  locationId: string;
  onStartRoutine: (routine: WorkoutRoutine) => void;
}

export function RoutineSection({ locationId, onStartRoutine }: RoutineSectionProps) {
  const lang = useLanguage();
  const routines = useRoutineStore((s) => s.routines);
  const [addVisible, setAddVisible] = useState(false);

  const locationRoutines = useMemo(
    () => useRoutineStore.getState().getRoutinesByLocation(locationId),
    [routines, locationId]
  );

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('routine', lang)}</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {locationRoutines.length === 0 ? (
          <Text style={styles.empty}>{t('routineEmpty', lang)}</Text>
        ) : (
          locationRoutines.map((routine) => (
            <Pressable
              key={routine.id}
              style={({ pressed }) => [styles.routineCard, pressed && styles.routineCardPressed]}
              onPress={() => onStartRoutine(routine)}
            >
              <View style={styles.routineLeft}>
                <Text style={styles.routineName}>{routine.name}</Text>
                <Text style={styles.routineMeta}>
                  {routine.exercises.length}
                  {t('routineExerciseSuffix', lang)}
                </Text>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.addRoutineBtn, pressed && styles.addRoutineBtnPressed]}
          onPress={() => setAddVisible(true)}
        >
          <Icon name="add" size={18} color={colors.textPrimary} />
          <Text style={styles.addRoutineText}>{t('addRoutine', lang)}</Text>
        </Pressable>
      </View>

      <AddRoutineSheet
        visible={addVisible}
        locationId={locationId}
        onClose={() => setAddVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: layout.screenPadding,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: 16,
  },
  empty: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: 32,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: layout.cardRadius,
    backgroundColor: colors.background,
  },
  routineCardPressed: {
    backgroundColor: colors.surface,
  },
  routineLeft: {
    flex: 1,
    gap: 4,
  },
  routineName: {
    ...typography.listItem,
    fontSize: 16,
  },
  routineMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  addRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    width: '100%',
    backgroundColor: colors.background,
  },
  addRoutineBtnPressed: {
    backgroundColor: colors.surface,
  },
  addRoutineText: {
    ...typography.button,
    color: colors.textPrimary,
    textTransform: 'none',
    letterSpacing: 0.3,
  },
});
