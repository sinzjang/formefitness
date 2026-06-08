// 코치 프로필 아바타
import { Image, StyleSheet, View } from 'react-native';
import type { CoachName } from '../../types';
import { COACHES } from '../../constants/coaches';
import { colors } from '../../constants/theme';

interface CoachAvatarProps {
  coachName: CoachName;
  size?: number;
}

export function CoachAvatar({ coachName, size = 36 }: CoachAvatarProps) {
  const coach = COACHES[coachName];

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Image
        source={coach.image}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
