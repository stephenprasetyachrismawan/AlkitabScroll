import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const still = VERSE_MAP['Mzm46.11'];
  const stillVerse = still ? passageText(still, lang === 'id' ? 'tb' : 'kjv') : null;

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
    <LinearGradient colors={['#FBF5E6', '#F2E4BE', '#E6D093']} style={styles.root}>
      <Pressable style={styles.lang} onPress={() => update({ lang: lang === 'id' ? 'en' : 'id' })}>
        <Text style={styles.langText}>{lang === 'id' ? 'EN' : 'ID'}</Text>
      </Pressable>
      <View style={styles.center}>
        <Text style={styles.mark}>⏸</Text>
        <Text style={styles.logo}>Selah</Text>
        <Text style={styles.tagline}>{t('appTagline')}</Text>
        {stillVerse ? (
          <Text style={styles.verse}>
            “{stillVerse.body}”{'\n'}
            {stillVerse.title} ({lang === 'id' ? 'TB' : 'KJV'})
          </Text>
        ) : null}
      </View>
      <View style={styles.bottom}>
        <Text style={styles.note}>{t('signInNote')}</Text>
        <Pressable style={styles.btn} onPress={go} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#4D3D12" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#4D3D12" />
              <Text style={styles.btnText}>{t('signInGoogle')}</Text>
            </>
          )}
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 28 },
  lang: { alignSelf: 'flex-end', marginTop: 40, padding: 8 },
  langText: { fontFamily: UI_FONT.bold, color: '#4D3D12' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  mark: { fontSize: 40, color: '#C9A227' },
  logo: { fontFamily: UI_FONT.title, fontSize: 56, color: '#4D3D12' },
  tagline: { fontFamily: UI_FONT.serif, fontSize: 17, color: '#6B5420', textAlign: 'center' },
  verse: { fontFamily: 'Lora_500Medium_Italic', fontSize: 15, color: '#6B5420', textAlign: 'center', marginTop: 24, lineHeight: 24 },
  bottom: { gap: 14, paddingBottom: 30 },
  note: { fontFamily: UI_FONT.regular, color: '#6B5420', textAlign: 'center' },
  btn: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF7',
    borderRadius: 999,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E0CC8F',
  },
  btnText: { fontFamily: UI_FONT.bold, fontSize: 16, color: '#4D3D12' },
});
