// 하단 탭 네비게이터: Home / Workout / Progress / Profile
// 디자인 시스템: 흰 배경, 활성=검정(#111), 비활성=회색(#888), 라벨은 Barlow Bold
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../constants/theme';
import { FormeTabBar } from '../../components/workout/FormeTabBar';

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  return (
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
            <Ionicons name={(focused ? 'home' : 'home-outline') as IoniconName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={(focused ? 'barbell' : 'barbell-outline') as IoniconName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={(focused ? 'stats-chart' : 'stats-chart-outline') as IoniconName} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={(focused ? 'person' : 'person-outline') as IoniconName} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
