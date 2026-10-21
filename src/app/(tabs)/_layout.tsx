import { Tabs } from 'expo-router';
import { GlassTabBar } from '../../components/GlassTabBar';
import { useSettings } from '../../lib/settings';

export default function TabsLayout() {
  const { t } = useSettings();
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
    >
      <Tabs.Screen name="index" options={{ title: t('home') }} />
      <Tabs.Screen name="explore" options={{ title: t('explore') }} />
      <Tabs.Screen name="inbox" options={{ title: t('messages') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile') }} />
    </Tabs>
  );
}
