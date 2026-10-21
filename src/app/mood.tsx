import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Aurora } from '../components/Aurora';
import { Glass } from '../components/Glass';
import { PressableScale } from '../components/PressableScale';
import { useAuth } from '../lib/auth';
import { useEngagement } from '../lib/engagement';
import { UI_FONT } from '../lib/fonts';
import { DURATION, EASE_OUT_EXPO } from '../lib/motion';
import { MOODS } from '../lib/moods';
import { useSettings } from '../lib/settings';

const rise = (i: number) => FadeInDown.duration(DURATION.enter).delay(i * DURATION.stagger).easing(EASE_OUT_EXPO);

/** Daily, required: the first thing a user sees each day. */
export default function MoodScreen() {
  const { t, lang, colors, dark } = useSettings();
  const { profile } = useAuth();
  const { chooseMood } = useEngagement();
  const [busy, setBusy] = useState<string | null>(null);

  const pick = async (key: string) => {
    try {
      setBusy(key);
      await chooseMood(key);
    } catch {
      Alert.alert('Selah', t('errorGeneric'));
      setBusy(null);
    }
  };

  const name = profile?.display_name?.split(' ')[0];

  return (
    <View style={styles.root}>
      <Aurora />
      <Animated.Text entering={rise(0)} style={[styles.hello, { color: colors.muted }]}>
        {lang === 'id' ? 'Shalom' : 'Hello'}
        {name ? `, ${name}` : ''}
      </Animated.Text>
      <Animated.Text entering={rise(1)} style={[styles.q, { color: colors.text }]}>
        {t('moodQuestion')}
      </Animated.Text>
      <Animated.Text entering={rise(2)} style={[styles.hint, { color: colors.muted }]}>
        {t('moodHint')}
      </Animated.Text>
      <View style={styles.grid}>
        {MOODS.map((m, i) => {
          const selected = busy === m.key;
          return (
            <Animated.View key={m.key} entering={rise(3 + i)} style={styles.cellWrap}>
              <PressableScale onPress={() => pick(m.key)} disabled={!!busy} haptic scaleTo={0.94} accessibilityRole="button" accessibilityLabel={m.label[lang]}>
                <Glass
                  dark={dark}
                  radius={26}
                  strength={selected ? 0.9 : 0.55}
                  style={[styles.cell, selected && { borderColor: colors.primary, borderWidth: 2 }, busy && !selected && { opacity: 0.45 }]}
                >
                  {selected ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.emoji}>{m.emoji}</Text>}
                  <Text style={[styles.label, { color: colors.text }]}>{m.label[lang]}</Text>
                </Glass>
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
  hello: { fontFamily: UI_FONT.semibold, fontSize: 16, textAlign: 'center' },
  q: { fontFamily: UI_FONT.title, fontSize: 30, lineHeight: 38, textAlign: 'center' },
  hint: { fontFamily: UI_FONT.regular, fontSize: 15, textAlign: 'center', marginBottom: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  cellWrap: { width: '30%', minWidth: 100 },
  cell: { aspectRatio: 0.88, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emoji: { fontSize: 42 },
  label: { fontFamily: UI_FONT.semibold, fontSize: 14 },
});
