// Home — 전신 SVG (크롭 없음)
import { View, StyleSheet, Platform } from 'react-native';
import Body from 'react-native-body-highlighter';
import type { ExtendedBodyPart } from 'react-native-body-highlighter';
import { Icon } from '../ui/Icon';
import { colors } from '../../constants/theme';

interface HomeBodyMapProps {
  side: 'front' | 'back';
  data: ExtendedBodyPart[];
}

export function HomeBodyMap({ side, data }: HomeBodyMapProps) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Icon name="body" size={48} color={colors.textMuted} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Body
        data={data}
        side={side}
        gender="male"
        scale={0.19}
        border="none"
        colors={[colors.accent, colors.accent]}
        defaultFill="#D8D8D8"
        defaultStroke="#C4C4C4"
        defaultStrokeWidth={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
});
