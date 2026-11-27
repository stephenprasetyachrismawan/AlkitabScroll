import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../components/Text';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChunkyButton } from '../components/ChunkyButton';
import { PressableScale } from '../components/PressableScale';
import { useAuth } from '../lib/auth';
import { UI_FONT } from '../lib/fonts';
import { DURATION, EASE_ENTER, EASE_IN_OUT, enter } from '../lib/motion';
import { useSettings } from '../lib/settings';
import { passageText, VERSE_MAP } from '../lib/verses';

// Hero entrance (taste-skill): the name first, then what it is, then what to do. ~1.1s, once.
const rise = (i: number) => FadeInDown.duration(520).delay(i * DURATION.stagger + 120).easing(EASE_ENTER);

/** The pause mark: two bars that take one slow breath when the screen opens. */
function PauseMark({ color }: { color: string }) {
  const s = useSharedValue(0.2);
  useEffect(() => {
    s.value = withSequence(withTiming(1, enter(700)), withDelay(200, withTiming(0.82, { duration: 1400, easing: EASE_IN_OUT })), withTiming(1, { duration: 1400, easing: EASE_IN_OUT }));
  }, [s]);
  const bar = useAnimatedStyle(() => ({ transform: [{ scaleY: s.value }] }));
  return (
    <View style={styles.mark} accessibilityElementsHidden importantForAccessibility="no">
      <Animated.View style={[styles.bar, { backgroundColor: color }, bar]} />
      <Animated.View style={[styles.bar, { backgroundColor: color }, bar]} />
    </View>
  );
}

export default function Login() {
  const { t, lang, update, colors } = useSettings();
  const { signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
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
    // Scrolls only when a large font size makes the screen taller than the phone.
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={[styles.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <PressableScale style={[styles.lang, { borderColor: colors.border }]} onPress={() => update({ lang: lang === 'id' ? 'en' : 'id' })} accessibilityRole="button" accessibilityLabel="Language">
        <Text style={[styles.langText, { color: colors.text }]} maxFontSizeMultiplier={1.3}>{lang === 'id' ? 'English' : 'Indonesia'}</Text>
      </PressableScale>

      <View style={styles.center}>
        <PauseMark color={colors.primary} />
        <Animated.Text entering={rise(0)} maxFontSizeMultiplier={1.05} style={[styles.logo, { color: colors.text }]}>
          Selah
        </Animated.Text>
        <Animated.Text entering={rise(1)} maxFontSizeMultiplier={1.3} style={[styles.tagline, { color: colors.muted }]}>
          {t('appTagline')}
        </Animated.Text>
        {stillVerse ? (
          <Animated.View entering={rise(3)} style={[styles.verseBox, { borderColor: colors.border }]}>
            <Text style={[styles.verse, { color: colors.text }]}>“{stillVerse.body}”</Text>
            <Text style={[styles.ref, { color: colors.primary }]}>
              {stillVerse.title} · {lang === 'id' ? 'TB' : 'KJV'}
            </Text>
          </Animated.View>
        ) : null}
      </View>

      <Animated.View entering={rise(5)} style={styles.bottom}>
        <Text style={[styles.note, { color: colors.muted }]}>{t('signInNote')}</Text>
        <ChunkyButton icon="logo-google" label={t('signInGoogle')} onPress={go} busy={busy} />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, paddingHorizontal: 24 },
  lang: { alignSelf: 'flex-end', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' },
  langText: { fontFamily: UI_FONT.semibold, fontSize: 13 },
  center: { flexGrow: 1, justifyContent: 'center', gap: 10, paddingVertical: 16 },
  mark: { flexDirection: 'row', gap: 7, height: 34, marginBottom: 6 },
  bar: { width: 8, height: 34, borderRadius: 3 },
  logo: { fontFamily: UI_FONT.title, fontSize: 64, letterSpacing: -2.4, lineHeight: 70 },
  tagline: { fontFamily: UI_FONT.semibold, fontSize: 18, lineHeight: 26, maxWidth: 300 },
  verseBox: { marginTop: 28, borderLeftWidth: 2, paddingLeft: 16, paddingVertical: 4, gap: 8 },
  verse: { fontFamily: UI_FONT.serifItalic, fontSize: 16, lineHeight: 26 },
  ref: { fontFamily: UI_FONT.bold, fontSize: 13, letterSpacing: 0.4 },
  bottom: { gap: 14 },
  note: { fontFamily: UI_FONT.regular, fontSize: 14, lineHeight: 20 },
});
