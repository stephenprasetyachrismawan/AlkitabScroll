import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { UI_FONT } from '../../lib/fonts';
import { timeAgo } from '../../lib/i18n';
import { cleanText } from '../../lib/moderation';
import { useSettings } from '../../lib/settings';
import { passageText, VERSE_MAP } from '../../lib/verses';

export default function Comments() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, colors, lang, translation } = useSettings();
  const { userId } = useAuth();
  const [list, setList] = useState<api.Comment[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const verse = VERSE_MAP[id];

  const load = useCallback(() => {
    api.listComments(id).then(setList).catch(() => {});
  }, [id]);
  useEffect(load, [load]);

  const send = async () => {
    if (!userId || !text.trim()) return;
    try {
      setSending(true);
      await api.addComment(userId, id, cleanText(text));
      setText('');
      load();
    } catch {
      Alert.alert('Selah', t('errorGeneric'));
    } finally {
      setSending(false);
    }
  };

  const moreFor = (c: api.Comment) => {
    if (!userId) return;
    const mine = c.user_id === userId;
    Alert.alert('Selah', undefined, [
      mine
        ? { text: t('delete'), style: 'destructive', onPress: () => api.deleteComment(c.id).then(load) }
        : { text: t('report'), onPress: () => api.report(userId, 'comment', String(c.id)).then(() => Alert.alert('Selah', t('reported'))) },
      ...(!mine ? [{ text: t('block'), style: 'destructive' as const, onPress: () => api.setBlock(userId, c.user_id, true).then(load) }] : []),
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('comments') }} />
      <FlatList
        data={list}
        keyExtractor={(c) => String(c.id)}
        ListHeaderComponent={
          verse ? (
            <View style={[styles.verse, { borderColor: colors.border }]}>
              <Text style={[styles.verseText, { color: colors.text }]}>{passageText(verse, translation).body}</Text>
              <Text style={[styles.verseRef, { color: colors.muted }]}>{passageText(verse, translation).title}</Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={<Text style={[styles.empty, { color: colors.muted }]}>{t('noComments')}</Text>}
        renderItem={({ item }) => (
          <Pressable onLongPress={() => moreFor(item)} style={styles.row}>
            <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user_id } })}>
              <Avatar profile={item.profile} size={36} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>
                {item.profile?.display_name ?? '…'} <Text style={{ color: colors.muted, fontFamily: UI_FONT.regular }}>· {timeAgo(item.created_at, lang)}</Text>
              </Text>
              <Text style={[styles.body, { color: colors.text }]}>{item.body}</Text>
            </View>
          </Pressable>
        )}
      />
      <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('writeComment')}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
          maxLength={1000}
          multiline
        />
        <Pressable onPress={send} disabled={sending || !text.trim()}>
          <Text style={[styles.send, { color: text.trim() ? colors.primary : colors.muted }]}>{t('send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  verse: { margin: 16, padding: 14, borderWidth: 1, borderRadius: 14, gap: 6 },
  verseText: { fontFamily: 'Lora_500Medium_Italic', fontSize: 15, lineHeight: 22 },
  verseRef: { fontFamily: UI_FONT.bold, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 30, fontFamily: UI_FONT.regular },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  name: { fontFamily: UI_FONT.bold, fontSize: 13 },
  body: { fontFamily: UI_FONT.regular, fontSize: 15, lineHeight: 21, marginTop: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 24 },
  input: { flex: 1, fontFamily: UI_FONT.regular, fontSize: 15, maxHeight: 100 },
  send: { fontFamily: UI_FONT.bold, fontSize: 15 },
});
