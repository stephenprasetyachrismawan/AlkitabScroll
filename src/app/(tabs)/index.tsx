import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '../../components/Aurora';
import { BackgroundMusic } from '../../components/BackgroundMusic';
import { Feed } from '../../components/Feed';
import { Glass } from '../../components/Glass';
import { ModeSwitch } from '../../components/ModeSwitch';
import { PressableScale } from '../../components/PressableScale';
import { StatusRow } from '../../components/StatusRow';
import { useEngagement } from '../../lib/engagement';
import { UI_FONT } from '../../lib/fonts';
import { MOOD_MAP } from '../../lib/moods';
import { useSettings } from '../../lib/settings';

export default function Home() {
  const { colors, viewMode, update, dark, music, t } = useSettings();
  const { moodToday } = useEngagement();
  const insets = useSafeAreaInsets();
  const reels = viewMode === 'reels';
  const [selahVisible, setSelahVisible] = useState(false);
  const [focused, setFocused] = useState(true);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [statusKey, setStatusKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setAppActive(s === 'active'));
    return () => sub.remove();
  }, []);

  // The quiet-time break is dark: keep the header readable on it.
  const fg = reels ? (dark || selahVisible ? '#fff' : '#1E1A16') : colors.text;
  const musicPlaying = music && focused && appActive && !selahVisible;

  const bar = (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }, reels && styles.barOverlay]}>
      <Text style={[styles.logo, { color: fg }]}>Selah</Text>
      <View style={styles.right}>
        <PressableScale onPress={() => update({ music: !music })} haptic accessibilityRole="switch" accessibilityState={{ checked: music }} accessibilityLabel={t('music')}>
          <Glass dark={dark} radius={22} strength={0.6} style={styles.round}>
            <Ionicons name={music ? 'musical-notes' : 'volume-mute-outline'} size={19} color={music ? colors.primary : colors.muted} />
          </Glass>
        </PressableScale>
        {moodToday ? (
          <Glass dark={dark} radius={22} strength={0.6} style={styles.round}>
            <Text style={styles.moodEmoji}>{MOOD_MAP[moodToday]?.emoji}</Text>
          </Glass>
        ) : null}
        <ModeSwitch mode={viewMode} onChange={(m) => update({ viewMode: m })} dark={dark} accent={colors.primary} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Aurora />
      <BackgroundMusic playing={musicPlaying} />
      {!reels ? bar : null}
      <Feed header={<StatusRow key={statusKey} />} onSelahVisible={setSelahVisible} onRefresh={() => setStatusKey((k) => k + 1)} />
      {reels ? bar : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  barOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  logo: { fontFamily: UI_FONT.title, fontSize: 28, letterSpacing: 0.3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  round: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  moodEmoji: { fontSize: 22 },
});
