import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { todayKey, verseOfTheDay } from './algorithm';
import { translate, type Lang } from './i18n';
import { passageText, VERSES, type Translation } from './verses';

export const CHANNEL_REMINDER = 'daily-reminder';
export const CHANNEL_MESSAGES = 'messages';
const REMINDER_DAYS_AHEAD = 7;

const isNative = Platform.OS !== 'web';

// Show notifications as banners even while the app is open.
if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Android needs channels before it will show the permission prompt (Android 13+). */
export async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_REMINDER, {
    name: 'Pengingat harian / Daily reminder',
    importance: AndroidImportance.DEFAULT,
    lightColor: '#9A6A3A',
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_MESSAGES, {
    name: 'Pesan / Messages',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#9A6A3A',
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function permissionState(): Promise<PermissionState> {
  if (!isNative) return 'unsupported';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Ask once; if Android already blocked us, send the user to system settings. */
export async function requestPermission(): Promise<PermissionState> {
  if (!isNative) return 'unsupported';
  await ensureChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) {
    await Linking.openSettings();
    return 'denied';
  }
  const res = await Notifications.requestPermissionsAsync();
  return res.granted ? 'granted' : res.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Schedules the next 7 daily reminders, each carrying that day's Verse of the Day.
 * Called on every app start, so the queue keeps rolling forward.
 */
export async function scheduleDailyReminders(opts: { enabled: boolean; hour: number; minute: number; lang: Lang; translation: Translation }) {
  if (!isNative) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.content.data?.kind === 'reminder').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!opts.enabled || (await permissionState()) !== 'granted') return;

  const now = new Date();
  for (let i = 0; i < REMINDER_DAYS_AHEAD + 1; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, opts.hour, opts.minute, 0);
    if (at.getTime() <= now.getTime() + 60_000) continue;
    const verse = verseOfTheDay(VERSES, todayKey(at));
    const p = passageText(verse, opts.translation);
    const body = p.body.length > 140 ? `${p.body.slice(0, 137)}…` : p.body;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: translate(opts.lang, 'reminderTitle'),
        body: `“${body}” — ${p.title}`,
        data: { kind: 'reminder', url: `/post/${verse.id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL_REMINDER },
    });
  }
}

export async function notifyNow(title: string, body: string, data: Record<string, string>, channelId = CHANNEL_MESSAGES) {
  if (!isNative) return;
  if ((await permissionState()) !== 'granted') return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: Platform.OS === 'android' ? { channelId } : null,
  });
}

/** Which chat is open, so we don't notify about messages the user is already reading. */
export const openChat = { partnerId: null as string | null };
