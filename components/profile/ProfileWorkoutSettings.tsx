// 프로필 하단 — 개발 링크
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { colors, typography } from '../../constants/theme';

export function ProfileWorkoutSettings() {
  return (
    <View style={styles.section}>
      <Pressable style={styles.devLink} onPress={() => router.push('/exercise-db-test')}>
        <Text style={styles.devLinkText}>ExerciseDB GIF 테스트</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  devLink: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
  },
  devLinkText: {
    ...typography.listItem,
    fontSize: 14,
  },
});
