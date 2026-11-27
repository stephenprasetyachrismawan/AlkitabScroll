import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChunkyButton } from './ChunkyButton';
import { FadeInView } from './FadeInView';
import { UI_FONT } from '../lib/fonts';
import { DURATION, timing } from '../lib/motion';
import { formatSize, type Release } from '../lib/releases';
import { useSettings } from '../lib/settings';
import { checkForUpdate, downloadUpdate, installUpdate, updaterEnabled, type Download } from '../lib/updater';

type Phase =
  | { kind: 'available' }
  | { kind: 'downloading' }
  | { kind: 'ready'; file: string }
  | { kind: 'error' };

/**
 * Settings entry for a newer GitHub release. Renders nothing while checking, when the app is
 * up to date, when offline, and on builds without the updater (Play, iOS, web).
 */
export function UpdateCard() {
  const { t, colors } = useSettings();
  const [release, setRelease] = useState<Release | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'available' });
  const [pct, setPct] = useState(0);
  const progress = useSharedValue(0);
  const dl = useRef<Download | null>(null);

  useEffect(() => {
    if (!updaterEnabled) return;
    const ac = new AbortController();
    checkForUpdate(ac.signal)
      .then(setRelease)
      .catch(() => {}); // offline or rate-limited: stay silent, try again next visit
    return () => {
      ac.abort();
      dl.current?.cancel();
    };
  }, []);

  const install = useCallback(async (file: string) => {
    try {
      await installUpdate(file);
    } catch {
      setPhase({ kind: 'error' });
    }
  }, []);

  const start = useCallback(() => {
    if (!release) return;
    setPhase({ kind: 'downloading' });
    setPct(0);
    progress.set(0);
    let last = 0;
    const d = downloadUpdate(release, (p) => {
      progress.set(withTiming(p, timing(DURATION.slide)));
      const whole = Math.floor(p * 100);
      if (whole !== last) {
        last = whole;
        setPct(whole);
      }
    });
    dl.current = d;
    d.promise
      .then((file) => {
        dl.current = null;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setPhase({ kind: 'ready', file });
        install(file);
      })
      .catch((e: Error) => {
        dl.current = null;
        setPhase(e?.message === 'cancelled' ? { kind: 'available' } : { kind: 'error' });
      });
  }, [release, progress, install]);

  const cancel = () => {
    dl.current?.cancel();
    dl.current = null;
    setPhase({ kind: 'available' });
  };

  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  if (!release) return null;

  const size = formatSize(release.size);
  const meta = [`Selah ${release.version}`, size].filter(Boolean).join(' · ');

  return (
    <FadeInView>
      <View
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary }]}
        accessibilityRole="summary"
        accessibilityLabel={`${t('updateTitle')}. ${meta}`}
      >
        <View style={styles.head}>
          <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="arrow-down" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.title, { color: colors.text }]}>{t('updateTitle')}</Text>
            <Text style={[styles.meta, { color: colors.muted }]}>{meta}</Text>
          </View>
        </View>

        {phase.kind === 'downloading' ? (
          <View style={{ gap: 10 }}>
            <View
              style={[styles.track, { backgroundColor: colors.surface }]}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: pct }}
            >
              <Animated.View style={[styles.fill, { backgroundColor: colors.primary }, bar]} />
            </View>
            <View style={styles.row}>
              <Text style={[styles.meta, { color: colors.text, flex: 1 }]}>
                {t('updateDownloading')} {pct}%
              </Text>
              <Pressable onPress={cancel} hitSlop={8} accessibilityRole="button" style={styles.tap}>
                <Text style={[styles.link, { color: colors.muted }]}>{t('updateCancel')}</Text>
              </Pressable>
            </View>
          </View>
        ) : phase.kind === 'ready' ? (
          <ChunkyButton label={t('updateInstall')} icon="checkmark" onPress={() => install(phase.file)} />
        ) : phase.kind === 'error' ? (
          <View style={{ gap: 10 }}>
            <Text style={[styles.body, { color: colors.danger }]}>{t('updateFailed')}</Text>
            <ChunkyButton label={t('updateRetry')} icon="refresh" onPress={start} />
            <Pressable onPress={() => Linking.openURL(release.pageUrl)} accessibilityRole="link" style={[styles.tap, { alignSelf: 'center' }]}>
              <Text style={[styles.link, { color: colors.primary }]}>{t('updateOpenGithub')}</Text>
            </Pressable>
          </View>
        ) : (
          <ChunkyButton label={t('updateNow')} icon="arrow-down" onPress={start} />
        )}

        <Text style={[styles.body, { color: colors.muted }]}>{t('updateNote')}</Text>
        {phase.kind === 'ready' ? <Text style={[styles.body, { color: colors.muted }]}>{t('updatePermission')}</Text> : null}
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1.5, borderRadius: 18, padding: 16, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: UI_FONT.title, fontSize: 18 },
  meta: { fontFamily: UI_FONT.semibold, fontSize: 13 },
  body: { fontFamily: UI_FONT.regular, fontSize: 13, lineHeight: 19 },
  link: { fontFamily: UI_FONT.bold, fontSize: 14 },
  // taste-skill: every control outside running text is at least 44px tall.
  tap: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, borderRadius: 999, transformOrigin: 'left' },
});
