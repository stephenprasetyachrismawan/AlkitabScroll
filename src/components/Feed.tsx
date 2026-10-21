import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DWELL_THRESHOLD_MS, FeedEngine, POSTS_BEFORE_SELAH, todayKey, verseOfTheDay, type Route } from '../lib/algorithm';
import * as api from '../lib/api';
import { CATEGORY_MAP } from '../lib/categories';
import { useEngagement } from '../lib/engagement';
import { UI_FONT } from '../lib/fonts';
import { useSettings } from '../lib/settings';
import { VERSE_MAP, VERSES, type Verse } from '../lib/verses';
import { SelahBreak } from './SelahBreak';
import { ShareSheet } from './ShareSheet';
import { VerseCard } from './VerseCard';

type Item =
  | { key: string; kind: 'verse'; verse: Verse; reason: string; badge?: string }
  | { key: string; kind: 'selah'; n: number; verse: Verse };

const BATCH = 10;

class FeedSession {
  engine: FeedEngine<Verse>;
  private shown = 0;
  private selahs = 0;

  constructor(category: string | undefined) {
    this.engine = new FeedEngine(category ? VERSES.filter((v) => v.categories.includes(category)) : VERSES);
  }

  batch(n: number, routes: Route[]): Item[] {
    const out: Item[] = [];
    for (let i = 0; i < n; i++) {
      const { verse, reason } = this.engine.next(routes);
      out.push({ key: `${verse.id}-${this.shown}`, kind: 'verse', verse, reason });
      this.shown++;
      if (this.shown % POSTS_BEFORE_SELAH === 0) {
        out.push({ key: `selah-${this.selahs}`, kind: 'selah', n: this.selahs++, verse: this.engine.next(routes).verse });
      }
    }
    return out;
  }
}

type FeedProps = {
  /** Open this verse first, then continue with the algorithm. */
  startVerseId?: string;
  /** Limit the feed to one category (Explore). */
  category?: string;
  header?: ReactElement;
};

export function Feed({ startVerseId, category, header }: FeedProps) {
  const { viewMode, translation, lang, dark, colors, t } = useSettings();
  const { routes, liked, saved, toggleLike, toggleSave, recordDwell } = useEngagement();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const [stats, setStats] = useState<Record<string, { likes: number; comments: number }>>({});
  const [shareVerse, setShareVerse] = useState<Verse | null>(null);
  const [ended, setEnded] = useState(false);
  const listRef = useRef<FlatList<Item>>(null);

  // One feed session per mount: holds the engine, counters and latest routes.
  const [session] = useState(() => new FeedSession(category));
  const routesRef = useRef(routes);
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  // First the opened verse (from profile/DM) or the verse of the day, then the algorithm.
  const [items, setItems] = useState<Item[]>(() => {
    const first: Item[] = [];
    const start = startVerseId ? VERSE_MAP[startVerseId] : undefined;
    if (start) {
      session.engine.markSeen(start.id);
      first.push({ key: `${start.id}-start`, kind: 'verse', verse: start, reason: start.categories[0] });
    } else if (!category) {
      const votd = verseOfTheDay(VERSES, todayKey());
      session.engine.markSeen(votd.id);
      first.push({ key: `${votd.id}-votd`, kind: 'verse', verse: votd, reason: votd.categories[0], badge: `☀️ ${t('verseOfDay')}` });
    }
    return [...first, ...session.batch(BATCH, routes)];
  });

  // Fetch like/comment counts for newly shown verses.
  useEffect(() => {
    const missing = items.filter((i) => i.kind === 'verse' && !stats[i.verse.id]).map((i) => i.verse.id);
    if (missing.length === 0) return;
    api
      .verseStats([...new Set(missing)])
      .then((s) => setStats((prev) => ({ ...prev, ...s })))
      .catch(() => {});
  }, [items, stats]);

  const loadMore = useCallback(() => {
    if (ended) return;
    setItems((prev) => [...prev, ...session.batch(BATCH, routesRef.current)]);
  }, [ended, session]);

  // Dwell tracking: a post that stays on screen long enough becomes a signal.
  const dwell = useRef<{ timer: ReturnType<typeof setTimeout> | null; record: (id: string) => void }>({ timer: null, record: recordDwell });
  useEffect(() => {
    dwell.current.record = recordDwell;
  }, [recordDwell]);
  const onViewable = useCallback(({ viewableItems }: { viewableItems: { item: Item }[] }) => {
    const d = dwell.current;
    if (d.timer) clearTimeout(d.timer);
    const top = viewableItems[0]?.item;
    if (top?.kind === 'verse') d.timer = setTimeout(() => d.record(top.verse.id), DWELL_THRESHOLD_MS);
  }, []);
  useEffect(() => {
    const d = dwell.current;
    return () => {
      if (d.timer) clearTimeout(d.timer);
    };
  }, []);

  const like = useCallback(
    (v: Verse) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const on = !liked.has(v.id);
      setStats((s) => ({ ...s, [v.id]: { likes: Math.max(0, (s[v.id]?.likes ?? 0) + (on ? 1 : -1)), comments: s[v.id]?.comments ?? 0 } }));
      toggleLike(v.id);
    },
    [liked, toggleLike],
  );

  const reels = viewMode === 'reels';
  const postH = Math.round((width * 4) / 3);

  const renderItem = useCallback(
    ({ item, index }: { item: Item; index: number }) => {
      if (item.kind === 'selah') {
        return (
          <SelahBreak
            width={width}
            height={reels ? height : Math.round(width * 1.5)}
            index={item.n}
            verse={item.verse}
            onContinue={() => listRef.current?.scrollToIndex({ index: Math.min(index + 1, items.length - 1), animated: true })}
            onEnough={() => setEnded(true)}
          />
        );
      }
      const v = item.verse;
      const s = stats[v.id];
      const actions = {
        liked: liked.has(v.id),
        saved: saved.has(v.id),
        likes: s?.likes ?? 0,
        comments: s?.comments ?? 0,
        onLike: () => like(v),
        onSave: () => toggleSave(v.id),
        onComment: () => router.push({ pathname: '/comments/[id]', params: { id: v.id } }),
        onShare: () => setShareVerse(v),
      };
      const reasonCat = CATEGORY_MAP[item.reason];

      if (reels) {
        return (
          <Pressable onLongPress={() => like(v)} delayLongPress={350} style={{ width, height }}>
            <VerseCard
              verse={v}
              width={width}
              height={height}
              translation={translation}
              lang={lang}
              dark={dark}
              category={category ?? item.reason}
              badge={item.badge}
              bottomInset={16}
              rightInset={44}
              topInset={insets.top + 56}
            />
            <View style={styles.reelActions}>
              <ActionColumn {...actions} color={dark ? '#fff' : '#1F1B16'} />
            </View>
          </Pressable>
        );
      }

      return (
        <View style={{ backgroundColor: colors.bg, marginBottom: 10 }}>
          <View style={styles.postHeader}>
            <View style={[styles.postIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text>{reasonCat?.emoji ?? '📖'}</Text>
            </View>
            <View>
              <Text style={[styles.postTitle, { color: colors.text }]}>{item.badge ?? 'Selah'}</Text>
              <Text style={[styles.postSub, { color: colors.muted }]}>
                {reasonCat ? `#${reasonCat.label[lang]}` : item.reason === 'random' ? '✨' : ''}
              </Text>
            </View>
          </View>
          <Pressable onLongPress={() => like(v)} delayLongPress={350}>
            <VerseCard verse={v} width={width} height={postH} translation={translation} lang={lang} dark={dark} category={category ?? item.reason} />
          </Pressable>
          <ActionRow {...actions} color={colors.text} muted={colors.muted} t={t} />
        </View>
      );
    },
    [width, height, insets.top, reels, category, items.length, stats, liked, saved, like, toggleSave, translation, lang, dark, colors, postH, t],
  );

  const onLayout = (e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height));

  const itemLayout = useMemo(
    () => (reels && height ? (_: unknown, index: number) => ({ length: height, offset: height * index, index }) : undefined),
    [reels, height],
  );

  if (ended) {
    return (
      <View style={[styles.end, { backgroundColor: colors.bg }]}>
        <Text style={styles.endEmoji}>🕊️</Text>
        <Text style={[styles.endText, { color: colors.text }]}>{t('enoughBody')}</Text>
        <Pressable onPress={() => setEnded(false)} style={[styles.endBtn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.muted, fontFamily: UI_FONT.semibold }}>{t('continueScroll')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
      {height > 0 ? (
        <FlatList
          ref={listRef}
          key={viewMode}
          data={items}
          keyExtractor={(i) => i.key}
          renderItem={renderItem}
          ListHeaderComponent={reels ? undefined : header}
          pagingEnabled={reels}
          snapToInterval={reels ? height : undefined}
          decelerationRate={reels ? 'fast' : 'normal'}
          getItemLayout={itemLayout}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={3}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 70 }}
          windowSize={5}
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          onScrollToIndexFailed={() => {}}
        />
      ) : null}
      <ShareSheet verse={shareVerse} onClose={() => setShareVerse(null)} />
    </View>
  );
}

type ActionProps = {
  liked: boolean;
  saved: boolean;
  likes: number;
  comments: number;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
  onShare: () => void;
};

function ActionColumn({ color, ...a }: ActionProps & { color: string }) {
  return (
    <View style={{ gap: 18, alignItems: 'center' }}>
      <IconBtn name={a.liked ? 'heart' : 'heart-outline'} color={a.liked ? '#E0245E' : color} label={a.likes} onPress={a.onLike} />
      <IconBtn name="chatbubble-outline" color={color} label={a.comments} onPress={a.onComment} />
      <IconBtn name={a.saved ? 'bookmark' : 'bookmark-outline'} color={color} onPress={a.onSave} />
      <IconBtn name="paper-plane-outline" color={color} onPress={a.onShare} />
    </View>
  );
}

function ActionRow({ color, muted, t, ...a }: ActionProps & { color: string; muted: string; t: (k: 'comments') => string }) {
  return (
    <View style={styles.actionRow}>
      <View style={{ flexDirection: 'row', gap: 18 }}>
        <IconBtn name={a.liked ? 'heart' : 'heart-outline'} color={a.liked ? '#E0245E' : color} onPress={a.onLike} />
        <IconBtn name="chatbubble-outline" color={color} onPress={a.onComment} />
        <IconBtn name="paper-plane-outline" color={color} onPress={a.onShare} />
      </View>
      <IconBtn name={a.saved ? 'bookmark' : 'bookmark-outline'} color={color} onPress={a.onSave} />
      <View style={{ width: '100%', marginTop: 4 }}>
        {a.likes > 0 ? <Text style={[styles.countText, { color }]}>❤ {a.likes}</Text> : null}
        {a.comments > 0 ? (
          <Pressable onPress={a.onComment}>
            <Text style={[styles.countText, { color: muted }]}>
              {a.comments} {t('comments').toLowerCase()}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function IconBtn({
  name,
  color,
  label,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  label?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={{ alignItems: 'center' }}>
      <Ionicons name={name} size={28} color={color} />
      {label !== undefined ? <Text style={[styles.iconLabel, { color }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  reelActions: { position: 'absolute', right: 12, bottom: 70 },
  iconLabel: { fontFamily: UI_FONT.bold, fontSize: 12, marginTop: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  postIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  postTitle: { fontFamily: UI_FONT.bold, fontSize: 14 },
  postSub: { fontFamily: UI_FONT.regular, fontSize: 12 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  countText: { fontFamily: UI_FONT.semibold, fontSize: 13, marginTop: 2 },
  end: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  endEmoji: { fontSize: 56 },
  endText: { fontFamily: UI_FONT.serif, fontSize: 20, textAlign: 'center', lineHeight: 30 },
  endBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
});
