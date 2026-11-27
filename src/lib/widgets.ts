// Keeps the home and lock screen widgets in step with the app: today's verse
// in the reader's translation and language, plus the day streak.
import { Platform } from 'react-native';
import type { Lang } from './i18n';
import { VERSES, type Translation } from './verses';
import { touchStreak, verseWidgetProps, verseWidgetTimeline, type Streak } from './widgetData';

const STREAK_KEY = 'selah.streak';

function readStreak(): Streak | null {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as Streak) : null;
  } catch {
    return null;
  }
}

/** Marks today as opened and returns the streak (stored locally, per device). */
export function markOpenedToday(now = new Date()): Streak {
  const next = touchStreak(readStreak(), now);
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

/**
 * Pushes fresh widget data. iOS gets a week of entries so the verse changes at
 * midnight even if the app stays closed; Android takes a single snapshot.
 * Never throws: a build without the widget module (Expo Go, web) just skips.
 */
export async function syncWidgets(opts: { translation: Translation; lang: Lang }) {
  if (Platform.OS === 'web') return;
  try {
    const streak = markOpenedToday();
    const { default: VerseWidget } = await import('../widgets/VerseWidget');
    const now = new Date();
    if (Platform.OS === 'ios') {
      VerseWidget.updateTimeline(verseWidgetTimeline(VERSES, now, opts.translation, opts.lang, streak));
    } else {
      VerseWidget.updateSnapshot(verseWidgetProps(VERSES, now, opts.translation, opts.lang, streak));
    }
  } catch (e) {
    console.warn('widgets', e);
  }
}
