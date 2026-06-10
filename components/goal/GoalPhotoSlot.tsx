// Goal 스크린 — 사진 슬롯 1칸
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, layout, typography } from '../../constants/theme';
import { formatGoalDate } from '../../lib/goalProgress';
import type { GoalCheckin } from '../../types/goal';
import { Icon } from '../ui/Icon';

interface GoalPhotoSlotProps {
  label: string;
  checkin?: GoalCheckin;
  emptyHint: string;
  onPress?: () => void;
  showNavLeft?: boolean;
  showNavRight?: boolean;
  onNavLeft?: () => void;
  onNavRight?: () => void;
}

export function GoalPhotoSlot({
  label,
  checkin,
  emptyHint,
  onPress,
  showNavLeft,
  showNavRight,
  onNavLeft,
  onNavRight,
}: GoalPhotoSlotProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.photoRow}>
        {showNavLeft ? (
          <Pressable onPress={onNavLeft} style={styles.navBtn} hitSlop={8}>
            <Icon name="chevron-back" size={20} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}

        <Pressable
          style={styles.photoBox}
          onPress={onPress}
          disabled={!onPress}
        >
          {checkin ? (
            <>
              <Image source={{ uri: checkin.photoUri }} style={styles.photo} contentFit="cover" />
              <View style={styles.meta}>
                <Text style={styles.day}>D+{checkin.dayIndex}</Text>
                <Text style={styles.date}>{formatGoalDate(checkin.takenAt)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <Icon name="add" size={28} color={colors.textMuted} />
              <Text style={styles.emptyHint}>{emptyHint}</Text>
            </View>
          )}
        </Pressable>

        {showNavRight ? (
          <Pressable onPress={onNavRight} style={styles.navBtn} hitSlop={8}>
            <Icon name="chevron-forward" size={20} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.navSpacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navSpacer: {
    width: 24,
  },
  photoBox: {
    flex: 1,
    aspectRatio: 1024 / 1536,
    borderRadius: layout.cardRadius,
    borderWidth: layout.borderWidth,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  meta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  day: {
    ...typography.caption,
    color: '#fff',
    fontWeight: '600',
  },
  date: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 10,
  },
});
