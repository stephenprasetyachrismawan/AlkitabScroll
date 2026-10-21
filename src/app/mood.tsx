import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { useEngagement } from '../lib/engagement';
import { UI_FONT } from '../lib/fonts';
import { MOODS } from '../lib/moods';
import { useSettings } from '../lib/settings';

/** Daily, required: the first thing a user sees each day. */
export default function MoodScreen() {
  const { t, lang, colors } = useSettings();
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
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Text style={[styles.hello, { color: colors.muted }]}>
        {lang === 'id' ? 'Shalom' : 'Hello'}
        {name ? `, ${name}` : ''} 👋
      </Text>
      <Text style={[styles.q, { color: colors.text }]}>{t('moodQuestion')}</Text>
      <Text style={[styles.hint, { color: colors.muted }]}>{t('moodHint')}</Text>
      <View style={styles.grid}>
        {MOODS.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => pick(m.key)}
            disabled={!!busy}
            style={({ pressed }) => [
              styles.cell,
              { backgroundColor: colors.card, borderColor: busy === m.key ? colors.primary : colors.border },
              pressed && { transform: [{ scale: 0.96 }] },
            ]}
          >
            {busy === m.key ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.emoji}>{m.emoji}</Text>}
            <Text style={[styles.label, { color: colors.text }]}>{m.label[lang]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
  hello: { fontFamily: UI_FONT.semibold, fontSize: 16, textAlign: 'center' },
  q: { fontFamily: UI_FONT.title, fontSize: 28, textAlign: 'center' },
  hint: { fontFamily: UI_FONT.regular, fontSize: 15, textAlign: 'center', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  cell: { width: '30%', minWidth: 96, aspectRatio: 0.9, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emoji: { fontSize: 40 },
  label: { fontFamily: UI_FONT.semibold, fontSize: 14 },
});
