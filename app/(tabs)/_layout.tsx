import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { colors, fonts } from '../../constants/theme';
import { FormeTabBar } from '../../components/workout/FormeTabBar';
import { CoachFloatingChat } from '../../components/coach/CoachFloatingChat';
import { Icon } from '../../components/ui/Icon';

export default function TabsLayout() {
  return (
    <View style={styles.root}>
    <Tabs
      tabBar={(props) => <FormeTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bold700,
          fontSize: 10,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="home" size={size} color={color} active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="barbell" size={size} color={color} active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="stats-chart" size={size} color={color} active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Pulse',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="feed" size={size} color={color} active={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="person" size={size} color={color} active={focused} />
          ),
        }}
      />
    </Tabs>
    <CoachFloatingChat />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
