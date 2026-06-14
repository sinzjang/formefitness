// 단일 세트 입력 행
// - 저항 타입은 운동에 고정 (weight / bodyweight / band)
// - 값(무게/밴드/맨몸+)과 횟수를 오른쪽에 하나의 그룹으로 묶음
// - 삭제는 행을 왼쪽으로 스와이프 (SwipeRow가 담당) → 휴지통 버튼 없음
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Icon } from '../ui/Icon';
import type { BandLevel, ResistanceType, SetData } from '../../types';
import { colors, typography, fonts } from '../../constants/theme';
import { t } from '../../lib/i18n';
import { useLanguage } from '../../stores/settingsStore';

const BAND_LEVELS: BandLevel[] = ['Lvl 1', 'Lvl 2', 'Lvl 3', 'Lvl 4'];

interface SetRowProps {
  set: SetData;
  resistanceType: ResistanceType;
  onChange: (data: Partial<SetData>) => void;
}

export function SetRow({ set, resistanceType, onChange }: SetRowProps) {
  const lang = useLanguage();
  // ko: "1세트", en: "Set 1"
  const setLabel =
    lang === 'en'
      ? `${t('setUnit', lang)} ${set.setNumber}`
      : `${set.setNumber}${t('setUnit', lang)}`;

  // 밴드: 탭하면 다음 강도로 순환 (없으면 Light부터)
  const cycleBand = () => {
    const idx = set.bandLevel ? BAND_LEVELS.indexOf(set.bandLevel) : -1;
    const next = BAND_LEVELS[(idx + 1) % BAND_LEVELS.length];
    onChange({ bandLevel: next });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.setNumber}>{setLabel}</Text>

      <View style={styles.spacer} />

      {/* 오른쪽: 값 + 횟수 묶음 */}
      <View style={styles.group}>
        {/* 값 셀 (저항 타입별) */}
        {resistanceType === 'weight' && (
          <View style={styles.cell}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={set.weightLb != null ? String(set.weightLb) : ''}
              onChangeText={(text) => onChange({ weightLb: text ? Number(text) : undefined })}
            />
            <Text style={styles.unit}>{t('weightUnit', lang)}</Text>
          </View>
        )}

        {resistanceType === 'bodyweight' && (
          <View style={styles.cell}>
            <Text style={styles.unit}>BW+</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={set.bwAddedLb != null ? String(set.bwAddedLb) : ''}
              onChangeText={(text) => onChange({ bwAddedLb: text ? Number(text) : undefined })}
            />
            <Text style={styles.unit}>{t('weightUnit', lang)}</Text>
          </View>
        )}

        {resistanceType === 'band' && (
          <Pressable style={styles.cell} onPress={cycleBand}>
            <Text style={[styles.bandText, !set.bandLevel && styles.bandPlaceholder]}>
              {set.bandLevel ?? t('resistanceBand', lang)}
            </Text>
          </Pressable>
        )}

        <View style={styles.groupDivider} />

        {/* 횟수 셀 */}
        <View style={styles.cell}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            value={set.reps ? String(set.reps) : ''}
            onChangeText={(text) => onChange({ reps: text ? Number(text) : 0 })}
          />
          <Text style={styles.unit}>{t('repsUnit', lang)}</Text>
        </View>
      </View>

      {/* 완료 토글 */}
      <Pressable
        onPress={() => onChange({ completed: !set.completed })}
        hitSlop={6}
        style={styles.check}
      >
        <Icon
          name={set.completed ? 'check-circle' : 'circle'}
          size={26}
          color={set.completed ? colors.success : colors.textMuted}
          active={set.completed}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  setNumber: {
    ...typography.listItem,
    fontSize: 14,
    color: colors.textSecondary,
  },
  spacer: {
    flex: 1,
  },
  // 값 + 횟수 묶음 박스
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    height: 40,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
    paddingHorizontal: 10,
    height: '100%',
  },
  groupDivider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    backgroundColor: colors.border,
  },
  input: {
    fontFamily: fonts.semibold600,
    fontSize: 15,
    color: colors.textPrimary,
    minWidth: 30,
    textAlign: 'center',
    paddingVertical: 0,
  },
  unit: {
    ...typography.caption,
    marginHorizontal: 2,
  },
  bandText: {
    fontFamily: fonts.semibold600,
    fontSize: 14,
    color: colors.textPrimary,
  },
  bandPlaceholder: {
    color: colors.textMuted,
  },
  check: {
    marginLeft: 12,
  },
});
