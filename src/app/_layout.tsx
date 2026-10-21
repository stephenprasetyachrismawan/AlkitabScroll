import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { EngagementProvider, useEngagement } from '../lib/engagement';
import { FONT_ASSETS } from '../lib/fonts';
import { SettingsProvider, useSettings } from '../lib/settings';
import { isSupabaseConfigured } from '../lib/supabase';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <EngagementProvider>
            <Gate />
          </EngagementProvider>
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

/** Routes the user: setup → login → today's mood → app. */
function Gate() {
  const { colors, dark } = useSettings();
  const { session, loading } = useAuth();
  const { ready, moodToday } = useEngagement();
  const segments = useSegments();
  const first = segments[0] as string | undefined;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      if (first !== 'setup') router.replace('/setup');
      return;
    }
    if (loading) return;
    if (!session) {
      if (first !== 'login') router.replace('/login');
      return;
    }
    if (!ready) return;
    if (!moodToday) {
      if (first !== 'mood') router.replace('/mood');
      return;
    }
    if (first === 'login' || first === 'mood' || first === 'setup' || first === 'auth-callback') router.replace('/');
  }, [first, session, loading, ready, moodToday]);

  const waiting = isSupabaseConfigured && (loading || (session && !ready));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: 'Nunito_700Bold' },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="comments/[id]" options={{ presentation: 'modal', headerShown: true }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="category/[key]" options={{ headerShown: true }} />
        <Stack.Screen name="status/create" options={{ presentation: 'modal', headerShown: true }} />
        <Stack.Screen name="status/view" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="settings" options={{ headerShown: true }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: true }} />
      </Stack>
      {waiting ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}
