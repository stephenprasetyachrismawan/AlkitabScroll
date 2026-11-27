import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../components/Text';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Avatar } from '../../components/Avatar';
import { StreakFlame, StreakNudge } from '../../components/FriendStreak';
import { FadeInView } from '../../components/FadeInView';
import { useToast } from '../../components/Toast';
import { Composer } from '../../components/chat/Composer';
import { MessageActions } from '../../components/chat/MessageActions';
import { MessageBubble, type BubbleStatus } from '../../components/chat/MessageBubble';
import { TypingDots } from '../../components/chat/TypingDots';
import { VersePicker } from '../../components/chat/VersePicker';
import * as api from '../../lib/api';
import { useAuth } from '../../lib/auth';
import {
  buildRows,
  displayBody,
  groupReactions,
  kindOf,
  quickReplies,
  toggleReaction,
  type ChatMessage,
  type ChatReaction,
  type QuickReply,
  type Row,
} from '../../lib/chat';
import { UI_FONT } from '../../lib/fonts';
import { cleanText } from '../../lib/moderation';
import { openChat } from '../../lib/notifications';
import { useSettings } from '../../lib/settings';
import { supabase } from '../../lib/supabase';
import { VERSE_MAP, type Verse } from '../../lib/verses';
import { friendStreak } from '../../lib/friendStreak';
import { useSowing } from '../../lib/sowingContext';

/** A message on screen; `_key` keeps a bubble mounted while its temporary id becomes the real one. */
type Local = ChatMessage & { _key?: string };

const TYPING_SEND_EVERY = 2500;
const TYPING_SHOW_FOR = 4000;

export default function Chat() {
  const { id: other } = useLocalSearchParams<{ id: string }>();
  const { colors, lang } = useSettings();
  const { userId: me } = useAuth();
  const toast = useToast();
  const { sowSeed } = useSowing();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const id = lang === 'id';

  const [partner, setPartner] = useState<api.Profile | null>(null);
  const [messages, setMessages] = useState<Local[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [reactions, setReactions] = useState<ChatReaction[]>([]);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [text, setText] = useState('');
  const [prayer, setPrayer] = useState(false);
  const [replyTo, setReplyTo] = useState<Local | null>(null);
  const [actionFor, setActionFor] = useState<Local | null>(null);
  const [picker, setPicker] = useState(false);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(false);

  const listRef = useRef<FlatList<Row>>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(0);
  const messagesRef = useRef<Local[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Silence alerts for the conversation on screen.
  useEffect(() => {
    openChat.partnerId = other;
    return () => {
      openChat.partnerId = null;
    };
  }, [other]);

  const refreshReactions = useCallback(async () => {
    const ids = messagesRef.current.map((m) => m.id).filter((x) => x > 0);
    setReactions(await api.reactionsFor(ids));
  }, []);

  useEffect(() => {
    if (!me || !other) return;
    let alive = true;
    api.getProfile(other).then((p) => alive && setPartner(p)).catch(() => {});
    api
      .conversation(me, other)
      .then(async (list) => {
        if (!alive) return;
        setMessages(list);
        setLoaded(true);
        const r = await api.reactionsFor(list.map((m) => m.id));
        if (alive) setReactions(r);
      })
      .catch(() => alive && setLoaded(true));
    api.markRead(me, other);

    // One channel per pair: new messages, read receipts, typing, reaction pings and presence.
    const pair = [me, other].sort().join('_');
    const channel = supabase
      .channel(`dm:${pair}`, { config: { presence: { key: me }, broadcast: { self: false } } })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` }, (payload) => {
        const m = payload.new as Local;
        if (m.sender_id !== other) return;
        setTyping(false);
        setFresh((s) => new Set(s).add(String(m.id)));
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        api.markRead(me, other);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `sender_id=eq.${me}` }, (payload) => {
        const m = payload.new as Local;
        if (m.recipient_id !== other) return;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
      })
      .on('broadcast', { event: 'typing' }, () => {
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), TYPING_SHOW_FOR);
      })
      .on('broadcast', { event: 'reactions' }, () => {
        refreshReactions().catch(() => {});
      })
      .on('presence', { event: 'sync' }, () => {
        setOnline(Object.keys(channel.presenceState()).includes(other));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ at: Date.now() }).catch(() => {});
      });
    channelRef.current = channel;
    return () => {
      alive = false;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [me, other, refreshReactions]);

  const ping = (event: 'typing' | 'reactions') => {
    channelRef.current?.send({ type: 'broadcast', event, payload: {} }).catch(() => {});
  };

  const onChangeText = (s: string) => {
    setText(s);
    const now = Date.now();
    if (s.trim() && now - lastTypingSent.current > TYPING_SEND_EVERY) {
      lastTypingSent.current = now;
      ping('typing');
    }
  };

  // ---------- sending ----------
  const deliver = async (local: Local) => {
    const key = local._key!;
    setFailed((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
    try {
      const saved = await api.sendMessage(local.sender_id, local.recipient_id, local.body ?? '', local.verse_id ?? undefined, {
        kind: local.kind,
        replyTo: local.reply_to,
      });
      setMessages((prev) => prev.map((x) => (x._key === key ? { ...saved, _key: key } : x)));
    } catch {
      setFailed((s) => new Set(s).add(key));
    }
  };

  const queue = (body: string, opts: { verseId?: string; kind?: api.MessageKind } = {}) => {
    if (!me || !other) return;
    const key = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const local: Local = {
      id: -Date.now(),
      _key: key,
      sender_id: me,
      recipient_id: other,
      body,
      verse_id: opts.verseId ?? null,
      read_at: null,
      created_at: new Date().toISOString(),
      kind: opts.kind ?? (opts.verseId ? 'verse' : 'text'),
      reply_to: replyTo && replyTo.id > 0 ? replyTo.id : null,
    };
    setFresh((s) => new Set(s).add(key));
    setMessages((prev) => [...prev, local]);
    setReplyTo(null);
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    deliver(local);
  };

  const send = () => {
    const body = cleanText(text).trim();
    if (!body) return;
    setText('');
    queue(body, { kind: prayer ? 'prayer' : 'text' });
    setPrayer(false);
  };

  const sendVerse = (v: Verse) => {
    setPicker(false);
    const caption = cleanText(text).trim();
    setText('');
    queue(caption, { verseId: v.id });
    sowSeed('friend', v.id);
  };

  // ---------- reactions ----------
  const react = async (m: Local, emoji: string, only: 'add' | 'toggle' = 'toggle') => {
    if (!me || m.id < 0) return;
    const r = { message_id: m.id, user_id: me, emoji };
    const exists = reactions.some((x) => x.message_id === r.message_id && x.user_id === me && x.emoji === emoji);
    if (only === 'add' && exists) return;
    const { next, added } = toggleReaction(reactions, r);
    setReactions(next);
    try {
      if (added) await api.addReaction(me, m.id, emoji);
      else await api.removeReaction(me, m.id, emoji);
      ping('reactions');
    } catch {
      setReactions(reactions);
      toast(id ? 'Reaksi belum bisa dikirim' : "Couldn't send the reaction", 'alert-circle-outline');
    }
  };

  const onQuick = (q: QuickReply) => {
    const last = messages[messages.length - 1];
    if (q.react && last && last.sender_id !== me) react(last, q.react, 'add');
    queue(q.body);
  };

  // ---------- derived ----------
  const byId = useMemo(() => Object.fromEntries(messages.map((m) => [m.id, m])), [messages]);
  const chips = useMemo(() => groupReactions(reactions, me ?? ''), [reactions, me]);
  const rows = useMemo(() => buildRows(messages, me ?? '', lang).reverse(), [messages, me, lang]);
  const lastMine = useMemo(() => [...messages].reverse().find((m) => m.sender_id === me), [messages, me]);
  const quick = useMemo(() => quickReplies(messages[messages.length - 1], me ?? '', lang), [messages, me, lang]);
  const partnerName = partner?.display_name ?? '…';

  const statusOf = (m: Local): BubbleStatus | undefined => {
    if (m._key && failed.has(m._key)) return 'failed';
    if (m.id < 0) return 'sending';
    if (m !== lastMine) return undefined;
    return m.read_at ? 'read' : 'sent';
  };

  const jumpTo = (target: number) => {
    const index = rows.findIndex((r) => r.type === 'msg' && r.message.id === target);
    if (index >= 0) listRef.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true });
  };

  const myReactionsFor = (m: Local | null) => new Set(m ? reactions.filter((r) => r.message_id === m.id && r.user_id === me).map((r) => r.emoji) : []);
  const prayed = (m: Local, who: string | null | undefined) => reactions.some((r) => r.message_id === m.id && r.user_id === who && r.emoji === '🙏');

  const subtitle = typing ? (id ? 'sedang mengetik…' : 'typing…') : online ? (id ? 'sedang di Selah' : 'on Selah now') : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable style={styles.title} onPress={() => router.push({ pathname: '/user/[id]', params: { id: other } })} accessibilityRole="button">
              <View>
                <Avatar profile={partner} size={34} />
                {online ? <View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: colors.bg }]} /> : null}
              </View>
              <View style={{ flexShrink: 1 }}>
                <Text style={[styles.titleName, { color: colors.text }]} numberOfLines={1}>
                  {partner?.display_name ?? ''}
                </Text>
                {subtitle ? (
                  <Text style={[styles.titleSub, { color: typing ? colors.primary : colors.muted }]} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ),
          headerRight: () => (me ? <StreakFlame streak={friendStreak(messages, me, other)} size={17} /> : null),
        }}
      />

      {loaded && messages.length === 0 ? (
        <View style={styles.empty}>
          <FadeInView style={{ alignItems: 'center', gap: 12 }}>
            <Avatar profile={partner} size={84} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{partnerName}</Text>
            <Text style={[styles.emptyBody, { color: colors.muted }]}>
              {id
                ? 'Mulai dengan salam, kirim ayat yang menguatkan, atau minta didoakan. Ketuk + di bawah.'
                : 'Start with hello, send a verse that lifts, or ask for prayer. Tap + below.'}
            </Text>
          </FadeInView>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          inverted
          data={rows}
          keyExtractor={(r) => (r.type === 'msg' ? ((r.message as Local)._key ?? r.key) : r.key)}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          initialNumToRender={20}
          windowSize={11}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
          }}
          ListHeaderComponent={
            typing ? (
              <FadeInView distance={8} style={{ marginTop: 10 }}>
                <TypingDots />
              </FadeInView>
            ) : undefined
          }
          renderItem={({ item }) => {
            if (item.type === 'day') {
              return (
                <View style={styles.day}>
                  <Text style={[styles.dayText, { color: colors.muted, backgroundColor: colors.surface }]}>{item.label}</Text>
                </View>
              );
            }
            const m = item.message as Local;
            const replied = m.reply_to ? (byId[m.reply_to] as Local | undefined) : undefined;
            return (
              <MessageBubble
                message={m}
                mine={item.mine}
                first={item.first}
                last={item.last}
                fresh={fresh.has(m._key ?? String(m.id))}
                reactions={chips[m.id]}
                replied={replied}
                repliedMine={replied?.sender_id === me}
                partnerName={partnerName}
                status={item.mine ? statusOf(m) : undefined}
                prayedByPartner={kindOf(m) === 'prayer' && prayed(m, other)}
                prayedByMe={kindOf(m) === 'prayer' && prayed(m, me)}
                onReact={(x, e) => react(x as Local, e)}
                onLongPress={(x) => setActionFor(x as Local)}
                onPray={(x) => react(x as Local, '🙏', 'add')}
                onRetry={(x) => deliver(x as Local)}
                onJumpTo={jumpTo}
              />
            );
          }}
        />
      )}

      {me ? (
        <StreakNudge
          me={me}
          other={other}
          partnerName={partner?.display_name ?? ''}
          messages={messages}
          onSend={async (verseId) => {
            queue('', { verseId });
            sowSeed('friend', verseId);
          }}
        />
      ) : null}
      <Composer
        value={text}
        onChange={onChangeText}
        prayer={prayer}
        onPrayer={setPrayer}
        reply={
          replyTo
            ? {
                name: replyTo.sender_id === me ? (id ? 'dirimu' : 'yourself') : partnerName,
                text: replyTo.verse_id ? `📖 ${VERSE_MAP[replyTo.verse_id]?.ref ?? ''}` : displayBody(replyTo),
              }
            : null
        }
        onCancelReply={() => setReplyTo(null)}
        onSend={send}
        onVerse={() => setPicker(true)}
        quick={quick}
        onQuick={onQuick}
        bottomInset={insets.bottom}
      />

      <MessageActions
        message={actionFor}
        mine={actionFor?.sender_id === me}
        myReactions={myReactionsFor(actionFor)}
        onClose={() => setActionFor(null)}
        onReact={(e) => {
          if (actionFor) react(actionFor, e);
          setActionFor(null);
        }}
        onReply={() => {
          setReplyTo(actionFor);
          setActionFor(null);
        }}
        onReport={() => {
          const m = actionFor;
          setActionFor(null);
          if (!me || !m) return;
          api
            .report(me, 'message', String(m.id))
            .then(() => toast(id ? 'Terima kasih, laporan terkirim' : 'Thanks, report sent', 'flag-outline'))
            .catch(() => toast(id ? 'Laporan gagal dikirim' : "Couldn't send report", 'alert-circle-outline'));
        }}
      />

      <VersePicker visible={picker} onClose={() => setPicker(false)} onPick={sendVerse} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleName: { fontFamily: UI_FONT.bold, fontSize: 16 },
  titleSub: { fontFamily: UI_FONT.semibold, fontSize: 12 },
  onlineDot: { position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  day: { alignItems: 'center', marginVertical: 14 },
  dayText: { fontFamily: UI_FONT.semibold, fontSize: 12, borderRadius: 10, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  emptyTitle: { fontFamily: UI_FONT.title, fontSize: 22 },
  emptyBody: { fontFamily: UI_FONT.regular, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
