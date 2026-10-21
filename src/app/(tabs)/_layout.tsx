import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { UI_FONT } from '../../lib/fonts';
import { useSettings } from '../../lib/settings';

type IconName = keyof typeof Ionicons.glyphMap;

export default function TabsLayout() {
  const { t, colors } = useSettings();
  const icon = (on: IconName, off: IconName) =>
    function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
      return <Ionicons name={focused ? on : off} size={24} color={color as string} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: UI_FONT.semibold, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('home'), tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="explore" options={{ title: t('explore'), tabBarIcon: icon('compass', 'compass-outline') }} />
      <Tabs.Screen name="inbox" options={{ title: t('messages'), tabBarIcon: icon('chatbubbles', 'chatbubbles-outline') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile'), tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
