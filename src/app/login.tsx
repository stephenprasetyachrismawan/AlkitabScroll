import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Glass } from '../components/Glass';
import { PressableScale } from '../components/PressableScale';
import { DURATION, EASE_OUT_EXPO } from '../lib/motion';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { UI_FONT } from '../lib/fonts';
import { useSettings } from '../lib/settings';
import { passageText, VERSE_MAP } from '../lib/verses';

export default function Login() {
  const { t, lang, update } = useSettings();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const still = VERSE_MAP['Mzm46.10'];
  const stillPassage = still ? passageText(still, lang === 'id' ? 'tb' : 'kjv') : null;
  // TB already quotes God's speech; strip those so we don't show “"…"”.
  const stillVerse = stillPassage ? { ...stillPassage, body: stillPassage.body.replace(/^["“]|["”]$/g, '') } : null;

  const go = async () => {
    try {
      setBusy(true);
      await signInWithGoogle();
    } catch (e) {
      Alert.alert('Selah', e instanceof Error ? e.message : t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={['#FCF7EC', '#F4E7C8', '#E9D49E']} style={styles.root}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      <PressableScale style={styles.lang} onPress={() => update({ lang: lang === 'id' ? 'en' : 'id' })} accessibilityRole="button">
        <Glass dark={false} radius={18} strength={0.5} style={styles.langGlass}>
          <Text style={styles.langText}>{lang === 'id' ? 'EN' : 'ID'}</Text>
        </Glass>
      </PressableScale>
      <View style={styles.center}>
        <Animated.View entering={ZoomIn.duration(DURATION.enter).easing(EASE_OUT_EXPO)}>
          <Glass dark={false} radius={36} strength={0.55} style={styles.markGlass}>
            <Ionicons name="pause" size={30} color="#B8902F" />
          </Glass>
        </Animated.View>
        <Animated.Text entering={rise(1)} style={styles.logo}>
          Selah
        </Animated.Text>
        <Animated.Text entering={rise(2)} style={styles.tagline}>
          {t('appTagline')}
        </Animated.Text>
        {stillVerse ? (
          <Animated.Text entering={rise(4)} style={styles.verse}>
            “{stillVerse.body}”{'\n'}
            {stillVerse.title} ({lang === 'id' ? 'TB' : 'KJV'})
          </Animated.Text>
        ) : null}
      </View>
      <Animated.View entering={rise(6)} style={styles.bottom}>
        <Text style={styles.note}>{t('signInNote')}</Text>
        <PressableScale onPress={go} disabled={busy} haptic accessibilityRole="button">
          <Glass dark={false} radius={30} strength={0.85} style={styles.btn}>
            {busy ? (
              <ActivityIndicator color="#4D3D12" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#4D3D12" />
                <Text style={styles.btnText}>{t('signInGoogle')}</Text>
              </>
            )}
          </Glass>
        </PressableScale>
      </Animated.View>
    </LinearGradient>
  );
}

const rise = (i: number) => FadeInDown.duration(DURATION.enter).delay(i * 90).easing(EASE_OUT_EXPO);

const styles = StyleSheet.create({
  root: { flex: 1, padding: 28, overflow: 'hidden' },
  glowTop: { position: 'absolute', top: -140, right: -120, width: 360, height: 360, borderRadius: 180, backgroundColor: '#FFFFFF', opacity: 0.3 },
  glowBottom: { position: 'absolute', bottom: -160, left: -120, width: 380, height: 380, borderRadius: 190, backgroundColor: '#E2B867', opacity: 0.35 },
  lang: { alignSelf: 'flex-end', marginTop: 40 },
  langGlass: { minWidth: 48, height: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  langText: { fontFamily: UI_FONT.bold, color: '#4D3D12' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  markGlass: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  logo: { fontFamily: UI_FONT.title, fontSize: 60, color: '#4D3D12', letterSpacing: 0.5 },
  tagline: { fontFamily: UI_FONT.serif, fontSize: 17, color: '#6B5420', textAlign: 'center' },
  verse: { fontFamily: 'Lora_500Medium_Italic', fontSize: 15, color: '#6B5420', textAlign: 'center', marginTop: 24, lineHeight: 24 },
  bottom: { gap: 14, paddingBottom: 30 },
  note: { fontFamily: UI_FONT.regular, color: '#6B5420', textAlign: 'center' },
  btn: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', minHeight: 58 },
  btnText: { fontFamily: UI_FONT.bold, fontSize: 16, color: '#4D3D12' },
});
