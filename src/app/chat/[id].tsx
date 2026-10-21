import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Avatar } from '../../components/Avatar';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { CATEGORY_MAP } from '../../lib/categories';
import { UI_FONT } from '../../lib/fonts';
import { cleanText } from '../../lib/moderation';
import { useSettings } from '../../lib/settings';
import { supabase } from '../../lib/supabase';
import { passageText, VERSE_MAP } from '../../lib/verses';

export default function Chat() {
  const { id: other } = useLocalSearchParams<{ id: string }>();
  const { t, colors, dark, translation } = useSettings();
  const { userId: me } = useAuth();
  const [partner, setPartner] = useState<api.Profile | null>(null);
  const [messages, setMessages] = useState<api.Message[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<api.Message>>(null);

  useEffect(() => {
    if (!me) return;
    api.getProfile(other).then(setPartner).catch(() => {});
    api.conversation(me, other).then(setMessages).catch(() => {});
    api.markRead(me, other);

    // Live updates for this conversation.
    const channel = supabase
      .channel(`dm-${me}-${other}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` }, (payload) => {
        const m = payload.new as api.Message;
        if (m.sender_id !== other) return;
        setMessages((prev) => [...prev, m]);
        api.markRead(me, other);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, other]);

  const send = async () => {
    if (!me || !text.trim()) return;
    const body = cleanText(text);
    setText('');
    try {
      await api.sendMessage(me, other, body);
      setMessages(await api.conversation(me, other));
    } catch {
      Alert.alert('Selah', t('errorGeneric'));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable style={styles.title} onPress={() => router.push({ pathname: '/user/[id]', params: { id: other } })}>
              <Avatar profile={partner} size={30} />
              <Text style={{ color: colors.text, fontFamily: UI_FONT.bold, fontSize: 16 }}>{partner?.display_name ?? ''}</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.sender_id === me;
          const v = item.verse_id ? VERSE_MAP[item.verse_id] : undefined;
          return (
            <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
              {v ? (
                <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: v.id } })}>
                  {(() => {
                    const c = CATEGORY_MAP[v.categories[0]];
                    const s = dark ? c.dark : c.light;
                    const p = passageText(v, translation);
                    return (
                      <LinearGradient colors={s.gradient} style={styles.verseBubble}>
                        <Text style={{ color: s.text, fontFamily: 'Lora_500Medium_Italic', fontSize: 14, lineHeight: 20 }} numberOfLines={8}>
                          “{p.body}”
                        </Text>
                        <Text style={{ color: s.text, fontFamily: UI_FONT.bold, fontSize: 12, marginTop: 8 }}>
                          {c.emoji} {p.title}
                        </Text>
                      </LinearGradient>
                    );
                  })()}
                </Pressable>
              ) : null}
              {item.body ? (
                <View style={[styles.bubble, mine ? { backgroundColor: colors.primary } : { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
                  <Text style={{ color: mine ? '#fff' : colors.text, fontFamily: UI_FONT.regular, fontSize: 15 }}>{item.body}</Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />
      <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="…"
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
          multiline
          maxLength={2000}
        />
        <Pressable onPress={send} disabled={!text.trim()}>
          <Text style={{ color: text.trim() ? colors.primary : colors.muted, fontFamily: UI_FONT.bold, fontSize: 15 }}>{t('send')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bubble: { maxWidth: '80%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  verseBubble: { width: 240, borderRadius: 18, padding: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 24 },
  input: { flex: 1, fontFamily: UI_FONT.regular, fontSize: 15, maxHeight: 100 },
});
