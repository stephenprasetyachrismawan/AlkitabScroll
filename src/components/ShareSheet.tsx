import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Alert, FlatList, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from './Text';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import '../lib/storage';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth';
import { UI_FONT } from '../lib/fonts';
import { useSettings } from '../lib/settings';
import { autoTheme, FORMATS, THEMES, type CardFormat } from '../lib/shareCards';
import type { ShareChannel } from '../lib/sowing';
import { STAGES } from '../lib/sowing';
import { useSowing } from '../lib/sowingContext';
import { CATEGORY_MAP } from '../lib/categories';
import type { Verse } from '../lib/verses';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Avatar } from './Avatar';
import { ChunkyButton } from './ChunkyButton';
import { PressableScale } from './PressableScale';
import { ShareCard } from './ShareCard';
import { SowingMeter, StageReached } from './Sowing';
import { Surface } from './Surface';

type Props = { verse: Verse | null; onClose: () => void };

const CAPTURE_W = 360;
const FORMAT_KEY = 'selah.cardFormat';
function savedFormat(): CardFormat {
  try {
    const f = localStorage.getItem(FORMAT_KEY);
    if (f === 'story' || f === 'post' || f === 'square') return f;
  } catch {}
  return 'story';
}

export function ShareSheet({ verse, onClose }: Props) {
  if (!verse) return null;
  return <Sheet key={verse.id} verse={verse} onClose={onClose} />;
}

function Sheet({ verse, onClose }: { verse: Verse; onClose: () => void }) {
  const { t, colors, translation, lang } = useSettings();
  const { userId } = useAuth();
  const { hasTheme, sowSeed, pending, clearPending, setSheetOpen } = useSowing();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [mode, setMode] = useState<'menu' | 'friends'>('menu');
  const [friends, setFriends] = useState<api.Profile[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [theme, setTheme] = useState(() => autoTheme(verse.categories, hasTheme));
  const [format, setFormat] = useState<CardFormat>(savedFormat);
  const [pop, setPop] = useState(0);
  const shotRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    setSheetOpen(true);
    return () => setSheetOpen(false);
  }, [setSheetOpen]);

  useEffect(() => {
    if (mode !== 'friends' || !userId) return;
    let alive = true;
    (async () => {
      const list = query.trim()
        ? await api.searchProfiles(query)
        : Object.values(await api.getProfiles(await api.followingIds(userId)));
      if (alive) setFriends(list.filter((p) => p.id !== userId));
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [mode, query, userId]);

  const seed = (channel: ShareChannel) => {
    const r = sowSeed(channel, verse.id);
    if (r.counted) {
      setPop((n) => n + 1);
      if (!r.reached) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  };

  const pickFormat = (f: CardFormat) => {
    try {
      localStorage.setItem(FORMAT_KEY, f);
    } catch {}
    setFormat(f);
  };

  const exportImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Selah', 'Export is available in the Android app.');
      return;
    }
    try {
      setBusy(true);
      const uri = await captureRef(shotRef, { format: 'png', quality: 1, ...FORMATS[format].out });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('shareCard') });
      seed('image');
    } catch {
      Alert.alert('Selah', t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const send = async (p: api.Profile) => {
    if (!userId) return;
    try {
      await api.sendMessage(userId, p.id, '', verse.id);
      setSentTo((s) => new Set(s).add(p.id));
      seed('friend');
    } catch {
      Alert.alert('Selah', t('errorGeneric'));
    }
  };

  // Preview fits a fixed height so switching formats doesn't make the sheet jump.
  const previewH = Math.min(320, screenH * 0.36);
  const previewW = Math.min(screenW - 40, previewH / FORMATS[format].ratio);
  const lockedAt = (key: string) => STAGES.find((s) => s.unlocks === key)?.at ?? 0;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('close')} />
      <Surface radius={28} style={[styles.sheet, { maxHeight: screenH * 0.92 }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        {mode === 'menu' ? (
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            <SowingMeter pop={pop} />

            <View style={{ alignItems: 'center', height: previewH, justifyContent: 'center' }}>
              <View style={[styles.preview, { borderColor: colors.border }]}>
                <ShareCard verse={verse} theme={theme} format={format} width={previewW} translation={translation} lang={lang} />
              </View>
            </View>

            <View style={[styles.segment, { backgroundColor: colors.surface }]} accessibilityRole="tablist">
              {(Object.keys(FORMATS) as CardFormat[]).map((f) => {
                const on = f === format;
                return (
                  <Pressable
                    key={f}
                    onPress={() => pickFormat(f)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                    style={[styles.segmentItem, on && { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.segmentText, { color: on ? colors.text : colors.muted }]}>{FORMATS[f].label[lang]}</Text>
                  </Pressable>
                );
              })}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
              {THEMES.map((th) => {
                const open = hasTheme(th.key);
                const on = th.key === theme;
                const tint = th.ground === 'category' ? CATEGORY_MAP[verse.categories[0]].light : null;
                const ground = tint ? tint.paper : (th.ground as string);
                const accent = tint ? tint.accent : th.accent;
                return (
                  <PressableScale
                    key={th.key}
                    scaleTo={0.94}
                    haptic
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: !open }}
                    accessibilityLabel={open ? th.name[lang] : `${th.name[lang]}, ${t('locked')}`}
                    onPress={() => (open ? setTheme(th.key) : Alert.alert(th.name[lang], `${t('lockedHint')} ${lockedAt(th.key)}.`))}
                    style={styles.themeItem}
                  >
                    <View style={[styles.swatch, { backgroundColor: ground, borderColor: on ? colors.text : colors.border, borderWidth: on ? 2 : 1 }]}>
                      {open ? <View style={[styles.swatchBar, { backgroundColor: accent }]} /> : <Ionicons name="lock-closed" size={16} color={accent} />}
                    </View>
                    <Text style={[styles.themeName, { color: open ? colors.text : colors.muted }]} numberOfLines={1}>
                      {open ? th.name[lang] : `${lockedAt(th.key)}`}
                      {open ? '' : ' '}
                      {open ? null : <Ionicons name="leaf" size={10} color={colors.muted} />}
                    </Text>
                  </PressableScale>
                );
              })}
            </ScrollView>

            <ChunkyButton label={t('shareCard')} icon="share-social-outline" onPress={exportImage} busy={busy} />
            <View style={styles.actions}>
              <Item icon="paper-plane-outline" label={t('sendToFriend')} onPress={() => setMode('friends')} />
              <Item
                icon="radio-button-on-outline"
                label={t('makeStatus')}
                onPress={() => {
                  onClose();
                  router.push({ pathname: '/status/create', params: { verse: verse.id } });
                }}
              />
            </View>
          </ScrollView>
        ) : (
          <View style={{ flex: 1, minHeight: 320 }}>
            <View style={styles.friendsHead}>
              <Pressable onPress={() => setMode('menu')} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('back')}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
              <Text style={[styles.friendsTitle, { color: colors.text }]}>{t('sendToFriend')}</Text>
            </View>
            <TextInput
              placeholder={t('searchUsers')}
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <FlatList
              data={friends}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <View style={styles.friend}>
                  <Avatar profile={item} size={40} />
                  <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  <Pressable
                    disabled={sentTo.has(item.id)}
                    onPress={() => send(item)}
                    style={[styles.sendBtn, { backgroundColor: sentTo.has(item.id) ? colors.border : colors.primary }]}
                  >
                    <Text style={[styles.sendText, { color: colors.onPrimary }]}>{sentTo.has(item.id) ? '✓' : t('send')}</Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        )}
      </Surface>

      {/* Off-screen card at a fixed layout width, captured at 1080px wide */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={shotRef} collapsable={false}>
          <ShareCard verse={verse} theme={theme} format={format} width={CAPTURE_W} translation={translation} lang={lang} />
        </View>
      </View>

      {pending ? (
        <StageReached
          key={pending.key}
          stage={pending}
          onTry={(k) => {
            setMode('menu');
            setTheme(k);
          }}
          onClose={clearPending}
        />
      ) : null}
    </Modal>
  );
}

function Item({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  const { colors } = useSettings();
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} haptic style={[styles.item, { backgroundColor: colors.surface }]} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={2}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20, paddingBottom: 32 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  preview: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  segmentText: { fontFamily: UI_FONT.semibold, fontSize: 14 },
  themeItem: { width: 62, alignItems: 'center', gap: 5 },
  swatch: { width: 48, height: 60, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  swatchBar: { width: 22, height: 3, borderRadius: 2 },
  themeName: { fontFamily: UI_FONT.semibold, fontSize: 11.5 },
  actions: { flexDirection: 'row', gap: 10 },
  item: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  itemText: { fontFamily: UI_FONT.semibold, fontSize: 14, flexShrink: 1 },
  friendsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  friendsTitle: { fontFamily: UI_FONT.display, fontSize: 18 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: UI_FONT.regular, marginBottom: 10 },
  friend: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  friendName: { flex: 1, fontFamily: UI_FONT.semibold, fontSize: 15 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  sendText: { fontFamily: UI_FONT.bold },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});
