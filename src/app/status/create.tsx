import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { VerseCard } from '../../components/VerseCard';
import { todayKey, verseOfTheDay } from '../../lib/algorithm';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useEngagement } from '../../lib/engagement';
import { UI_FONT } from '../../lib/fonts';
import { cleanText } from '../../lib/moderation';
import { useSettings } from '../../lib/settings';
import { passageText, VERSE_MAP, VERSES } from '../../lib/verses';

/** Status = a verse card + note, visible 24h to followers; also exportable for WhatsApp/IG. */
export default function CreateStatus() {
  const params = useLocalSearchParams<{ verse?: string }>();
  const { t, colors, translation, lang, dark } = useSettings();
  const { userId } = useAuth();
  const { savedOrder, likedOrder } = useEngagement();
  const { width } = useWindowDimensions();

  const choices = useMemo(() => {
    const ids = [...new Set([...(params.verse ? [params.verse] : []), ...savedOrder, ...likedOrder])].filter((id) => VERSE_MAP[id]);
    return ids.length ? ids : [verseOfTheDay(VERSES, todayKey()).id];
  }, [params.verse, savedOrder, likedOrder]);

  const [verseId, setVerseId] = useState(choices[0]);
  const [variant, setVariant] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const shotRef = useRef<ComponentRef<typeof View>>(null);
  const verse = VERSE_MAP[verseId];

  const previewW = Math.min(width * 0.62, 280);
  const previewH = (previewW * 16) / 9;

  const post = async () => {
    if (!userId) return;
    try {
      setBusy(true);
      await api.postStatus(userId, verseId, cleanText(note.trim()), variant);
      Alert.alert('Selah', t('statusPosted'));
      router.back();
    } catch {
      Alert.alert('Selah', t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const exportImage = async () => {
    if (Platform.OS === 'web') return Alert.alert('Selah', 'Export is available in the Android app.');
    try {
      const uri = await captureRef(shotRef, { format: 'png', quality: 1, width: 1080, height: 1920 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      Alert.alert('Selah', t('errorGeneric'));
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 14, alignItems: 'center' }}>
      <Stack.Screen options={{ title: t('status') }} />
      <View ref={shotRef} collapsable={false} style={{ borderRadius: 18, overflow: 'hidden' }}>
        <VerseCard verse={verse} width={previewW} height={previewH} translation={translation} lang={lang} dark={dark} variant={variant} badge="Selah" />
        {note.trim() ? (
          <View style={styles.noteOverlay}>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[0, 1, 2].map((v) => (
          <Pressable key={v} onPress={() => setVariant(v)} style={[styles.variant, { borderColor: variant === v ? colors.primary : colors.border }]}>
            <Text style={{ color: colors.text, fontFamily: UI_FONT.bold }}>{['Aa', '“', '▢'][v]}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        horizontal
        data={choices}
        keyExtractor={(id) => id}
        style={{ alignSelf: 'stretch' }}
        contentContainerStyle={{ gap: 8 }}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable onPress={() => setVerseId(item)} style={[styles.chip, { borderColor: item === verseId ? colors.primary : colors.border, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.text, fontFamily: UI_FONT.semibold, fontSize: 12 }}>{passageText(VERSE_MAP[item], translation).title}</Text>
          </Pressable>
        )}
      />

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t('statusNote')}
        placeholderTextColor={colors.muted}
        maxLength={200}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
      />

      <Pressable onPress={post} disabled={busy} style={[styles.btn, { backgroundColor: colors.primary }]}>
        <Text style={styles.btnText}>{t('makeStatus')}</Text>
      </Pressable>
      <Pressable onPress={exportImage} style={[styles.btn, { borderWidth: 1, borderColor: colors.border }]}>
        <Text style={[styles.btnText, { color: colors.text }]}>{t('exportImage')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  noteOverlay: { position: 'absolute', left: 12, right: 12, bottom: 34, backgroundColor: '#0008', borderRadius: 12, padding: 10 },
  noteText: { color: '#fff', fontFamily: UI_FONT.semibold, fontSize: 13, textAlign: 'center' },
  variant: { width: 48, height: 40, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  input: { alignSelf: 'stretch', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: UI_FONT.regular },
  btn: { alignSelf: 'stretch', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontFamily: UI_FONT.bold, fontSize: 15 },
});
