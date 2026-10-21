import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
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
import { supabase } from '../lib/supabase';
import { VERSE_MAP, VERSES, type Verse } from '../lib/verses';
import { SelahBreak } from './SelahBreak';
import { ShareSheet } from './ShareSheet';
import { VerseCard } from './VerseCard';
import { Glass } from './Glass';
import { useTabBarSpace } from './GlassTabBar';
import { DoubleTapLike, GlassAction, LIKE_RED, PopIcon } from './Interactions';
import { PressableScale } from './PressableScale';

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

function initialItems(session: FeedSession, routes: Route[], startVerseId: string | undefined, category: string | undefined, votdBadge: string): Item[] {
  const first: Item[] = [];
  const start = startVerseId ? VERSE_MAP[startVerseId] : undefined;
  if (start) {
    session.engine.markSeen(start.id);
    first.push({ key: `${start.id}-start`, kind: 'verse', verse: start, reason: start.categories[0] });
  } else if (!category) {
    const votd = verseOfTheDay(VERSES, todayKey());
    session.engine.markSeen(votd.id);
    first.push({ key: `${votd.id}-votd`, kind: 'verse', verse: votd, reason: votd.categories[0], badge: votdBadge });
  }
  return [...first, ...session.batch(BATCH, routes)];
}

const STATS_POLL_MS = 15_000;

type FeedProps = {
  /** Open this verse first, then continue with the algorithm. */
  startVerseId?: string;
  /** Limit the feed to one category (Explore). */
  category?: string;
  header?: ReactElement;
  /** Tells the parent when the quiet-time break is on screen (music pauses for it). */
  onSelahVisible?: (visible: boolean) => void;
  /** Pull-to-refresh also refreshes things above the feed (e.g. statuses). */
  onRefresh?: () => void;
};

export function Feed({ startVerseId, category, header, onSelahVisible, onRefresh }: FeedProps) {
  const { viewMode, translation, lang, dark, colors, t } = useSettings();
  const { routes, liked, saved, toggleLike, toggleSave, recordDwell } = useEngagement();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [height, setHeight] = useState(0);
  const [stats, setStats] = useState<Record<string, { likes: number; comments: number }>>({});
  const [shareVerse, setShareVerse] = useState<Verse | null>(null);
  const [ended, setEnded] = useState(false);
  const listRef = useRef<FlatList<Item>>(null);

  // One feed session per mount: holds the engine, counters and latest routes.
  const [session, setSession] = useState(() => new FeedSession(category));
  const [refreshing, setRefreshing] = useState(false);
  const routesRef = useRef(routes);
  useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  // First the opened verse (from profile/DM) or the verse of the day, then the algorithm.
  const [items, setItems] = useState<Item[]>(() => initialItems(session, routes, startVerseId, category, t('verseOfDay')));
  const itemsRef = useRef(items);
  const activeRef = useRef<string | null>(null);
  useEffect(() => {
    itemsRef.current = items;
    activeRef.current = activeKey;
  }, [items, activeKey]);

  const refreshStats = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    api
      .verseStats([...new Set(ids)])
      .then((s) => setStats((prev) => ({ ...prev, ...s })))
      .catch(() => {});
  }, []);

  /** Verse ids around the card on screen. */
  const nearbyIds = useCallback(() => {
    const list = itemsRef.current;
    const i = Math.max(0, list.findIndex((x) => x.key === activeRef.current));
    return list.slice(Math.max(0, i - 3), i + 5).flatMap((x) => (x.kind === 'verse' ? [x.verse.id] : []));
  }, []);

  // Live counts: Supabase realtime pushes like/comment changes; a slow poll covers gaps.
  useEffect(() => {
    const channel = supabase
      .channel(`feed-stats-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (p) => {
        const id = ((p.new as { verse_id?: string })?.verse_id ?? (p.old as { verse_id?: string })?.verse_id) as string | undefined;
        if (id && itemsRef.current.some((x) => x.kind === 'verse' && x.verse.id === id)) refreshStats([id]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (p) => {
        const id = (p.new as { verse_id?: string })?.verse_id;
        refreshStats(id ? [id] : nearbyIds());
      })
      .subscribe();
    const poll = setInterval(() => refreshStats(nearbyIds()), STATS_POLL_MS);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [refreshStats, nearbyIds]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    const next = new FeedSession(category);
    const fresh = initialItems(next, routesRef.current, startVerseId, category, t('verseOfDay'));
    setSession(next);
    setItems(fresh);
    setEnded(false);
    onRefresh?.();
    api
      .verseStats(fresh.flatMap((x) => (x.kind === 'verse' ? [x.verse.id] : [])))
      .then((s) => setStats((prev) => ({ ...prev, ...s })))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [category, startVerseId, t, onRefresh]);

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

  const selahCb = useRef(onSelahVisible);
  useEffect(() => {
    selahCb.current = onSelahVisible;
  }, [onSelahVisible]);

  // Dwell tracking: a post that stays on screen long enough becomes a signal.
  const dwell = useRef<{ timer: ReturnType<typeof setTimeout> | null; record: (id: string) => void }>({ timer: null, record: recordDwell });
  useEffect(() => {
    dwell.current.record = recordDwell;
  }, [recordDwell]);
  const onViewable = useCallback(({ viewableItems }: { viewableItems: { item: Item }[] }) => {
    const d = dwell.current;
    if (d.timer) clearTimeout(d.timer);
    const top = viewableItems[0]?.item;
    if (top) setActiveKey(top.key);
    selahCb.current?.(top?.kind === 'selah');
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
  // Double-tap only ever likes (never un-likes), like every photo app.
  const likeOnly = useCallback((v: Verse) => {
    if (!liked.has(v.id)) like(v);
  }, [liked, like]);

  const reels = viewMode === 'reels';
  const cardW = width - 24;
  const postH = Math.round((cardW * 4) / 3);

  const renderItem = useCallback(
    ({ item, index }: { item: Item; index: number }) => {
      if (item.kind === 'selah') {
        return (
          <SelahBreak
            width={width}
            height={reels ? height : Math.round(width * 1.5)}
            bottomInset={reels ? tabSpace : 0}
            index={item.n}
            verse={item.verse}
            onContinue={() => listRef.current?.scrollToIndex({ index: Math.min(index + 1, items.length - 1), animated: true })}
            onEnough={() => setEnded(true)}
          />
        );
      }
      const v = item.verse;
      const s = stats[v.id];
      const actions: ActionProps = {
        liked: liked.has(v.id),
        saved: saved.has(v.id),
        likes: s?.likes ?? 0,
        comments: s?.comments ?? 0,
        onLike: () => like(v),
        onSave: () => {
          Haptics.selectionAsync().catch(() => {});
          toggleSave(v.id);
        },
        onComment: () => router.push({ pathname: '/comments/[id]', params: { id: v.id } }),
        onShare: () => setShareVerse(v),
      };
      const reasonCat = CATEGORY_MAP[item.reason];
      const active = item.key === activeKey;

      if (reels) {
        return (
          <View style={{ width, height }}>
            <DoubleTapLike onDoubleTap={() => likeOnly(v)} style={{ width, height }}>
              <VerseCard
                verse={v}
                width={width}
                height={height}
                translation={translation}
                lang={lang}
                dark={dark}
                category={category ?? item.reason}
                badge={item.badge}
                bottomInset={tabSpace}
                rightInset={56}
                topInset={insets.top + 56}
                active={active}
              />
            </DoubleTapLike>
            <View style={[styles.reelActions, { bottom: tabSpace + 28 }]}>
              <GlassAction icon={actions.liked ? 'heart' : 'heart-outline'} on={actions.liked} onColor={LIKE_RED} label={actions.likes} onPress={actions.onLike} dark={dark} />
              <GlassAction icon="chatbubble-outline" label={actions.comments} onPress={actions.onComment} dark={dark} />
              <GlassAction icon={actions.saved ? 'bookmark' : 'bookmark-outline'} on={actions.saved} onColor={colors.primary} onPress={actions.onSave} dark={dark} />
              <GlassAction icon="paper-plane-outline" onPress={actions.onShare} dark={dark} />
            </View>
          </View>
        );
      }

      return (
        <View style={styles.post}>
          <View style={styles.postHeader}>
            <Glass dark={dark} radius={20} strength={0.6} style={styles.postIcon}>
              <Ionicons name={(reasonCat?.icon ?? 'sparkles-outline') as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
            </Glass>
            <View>
              <Text style={[styles.postTitle, { color: colors.text }]}>{item.badge ?? 'Selah'}</Text>
              <Text style={[styles.postSub, { color: colors.muted }]}>{reasonCat ? reasonCat.label[lang] : t('explore')}</Text>
            </View>
          </View>
          <DoubleTapLike onDoubleTap={() => likeOnly(v)} style={[styles.postCard, { width: cardW, height: postH }]}>
            <VerseCard verse={v} width={cardW} height={postH} translation={translation} lang={lang} dark={dark} category={category ?? item.reason} active={active} />
          </DoubleTapLike>
          <ActionRow {...actions} color={colors.text} muted={colors.muted} primary={colors.primary} t={t} />
        </View>
      );
    },
    [width, height, cardW, tabSpace, insets.top, reels, category, items.length, stats, liked, saved, like, likeOnly, toggleSave, translation, lang, dark, colors, postH, t, activeKey],
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
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {height > 0 ? (
        <FlatList
          ref={listRef}
          key={viewMode}
          data={items}
          keyExtractor={(i) => i.key}
          renderItem={renderItem}
          ListHeaderComponent={reels ? undefined : header}
          ListFooterComponent={reels ? undefined : <View style={{ height: tabSpace }} />}
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
          refreshControl={
            reels ? undefined : (
              <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} progressViewOffset={8} />
            )
          }
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

function ActionRow({ color, muted, primary, t, ...a }: ActionProps & { color: string; muted: string; primary: string; t: (k: 'comments') => string }) {
  return (
    <View style={styles.actionRow}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <IconBtn onPress={a.onLike} label="like">
          <PopIcon name={a.liked ? 'heart' : 'heart-outline'} on={a.liked} color={a.liked ? LIKE_RED : color} />
        </IconBtn>
        <IconBtn onPress={a.onComment} label="comment">
          <Ionicons name="chatbubble-outline" size={25} color={color} />
        </IconBtn>
        <IconBtn onPress={a.onShare} label="share">
          <Ionicons name="paper-plane-outline" size={25} color={color} />
        </IconBtn>
      </View>
      <IconBtn onPress={a.onSave} label="save">
        <PopIcon name={a.saved ? 'bookmark' : 'bookmark-outline'} on={a.saved} color={a.saved ? primary : color} />
      </IconBtn>
      <View style={{ width: '100%', paddingHorizontal: 8 }}>
        {a.likes > 0 ? <Text style={[styles.countText, { color }]}>{a.likes} ♥</Text> : null}
        {a.comments > 0 ? (
          <Pressable onPress={a.onComment} hitSlop={8}>
            <Text style={[styles.countText, { color: muted }]}>
              {a.comments} {t('comments').toLowerCase()}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** 48dp touch target around each icon (Android guideline). */
function IconBtn({ children, onPress, label }: { children: ReactNode; onPress: () => void; label: string }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.86} accessibilityRole="button" accessibilityLabel={label} style={styles.iconBtn}>
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  reelActions: { position: 'absolute', right: 12, gap: 14, alignItems: 'center' },
  post: { marginBottom: 18 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10 },
  postIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  postTitle: { fontFamily: UI_FONT.bold, fontSize: 14 },
  postSub: { fontFamily: UI_FONT.regular, fontSize: 12 },
  postCard: {
    marginHorizontal: 12,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#3A2A1A',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 6 },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: UI_FONT.semibold, fontSize: 13, marginTop: 2 },
  end: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  endEmoji: { fontSize: 56 },
  endText: { fontFamily: UI_FONT.serif, fontSize: 20, textAlign: 'center', lineHeight: 30 },
  endBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
});
