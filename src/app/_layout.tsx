import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from '../lib/auth';
import { DailyProvider } from '../lib/daily';
import { EngagementProvider, useEngagement } from '../lib/engagement';
import { JourneyProvider } from '../lib/journey/progress';
import { SettingsProvider, useSettings } from '../lib/settings';
import { useAppFonts } from '../lib/useAppFonts';
import { isSupabaseConfigured } from '../lib/supabase';
import { NotificationsManager } from '../components/NotificationsManager';
import { Celebration } from '../components/Celebration';
import { ToastProvider } from '../components/Toast';
import { WidgetSync } from '../components/WidgetSync';

export default function RootLayout() {
  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <KeyboardProvider>
      <SettingsProvider>
        <AuthProvider>
          <EngagementProvider>
            <DailyProvider>
              <JourneyProvider>
                <ToastProvider>
                  <Gate />
                  <Celebration />
                </ToastProvider>
              </JourneyProvider>
            </DailyProvider>
          </EngagementProvider>
        </AuthProvider>
      </SettingsProvider>
      </KeyboardProvider>
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
      {isSupabaseConfigured && Platform.OS !== 'web' ? <NotificationsManager /> : null}
      {Platform.OS !== 'web' ? <WidgetSync /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 280,
          contentStyle: { backgroundColor: colors.bg },
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: 'Gabarito_700Bold' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="mood" options={{ animation: 'fade' }} />
        <Stack.Screen name="comments/[id]" options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: true }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="category/[key]" options={{ headerShown: true }} />
        <Stack.Screen name="status/create" options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: true }} />
        <Stack.Screen name="status/view" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="curhat" options={{ headerShown: true }} />
        <Stack.Screen name="settings" options={{ headerShown: true }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: true }} />
        <Stack.Screen name="lesson/[id]" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="practice" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="memorize-add" options={{ presentation: 'modal', animation: 'slide_from_bottom', headerShown: true }} />
      </Stack>
      {waiting ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}
