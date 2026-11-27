import { Tabs } from 'expo-router';
import { TabBar } from '../../components/TabBar';
import { useSettings } from '../../lib/settings';

export default function TabsLayout() {
  const { t, colors } = useSettings();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" options={{ title: t('home') }} />
      <Tabs.Screen name="explore" options={{ title: t('explore') }} />
      <Tabs.Screen name="inbox" options={{ title: t('messages') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile') }} />
    </Tabs>
  );
}
