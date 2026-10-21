import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth';
import { useEngagement } from '../lib/engagement';
import { translate } from '../lib/i18n';
import { ensureChannels, notifyNow, openChat, requestPermission, scheduleDailyReminders } from '../lib/notifications';
import { useSettings } from '../lib/settings';
import { supabase } from '../lib/supabase';
import { VERSE_MAP } from '../lib/verses';

/** Invisible: owns permission, the daily reminder queue, message alerts and notification taps. */
export function NotificationsManager() {
  const { lang, translation, reminder, reminderHour, reminderMinute, messageAlerts, askedNotif, update } = useSettings();
  const { userId } = useAuth();
  const { moodToday } = useEngagement();
  const native = Platform.OS !== 'web';

  // Ask once, right after the first mood check-in (a calm moment, not at launch).
  useEffect(() => {
    if (!native || !userId || !moodToday || askedNotif) return;
    (async () => {
      await requestPermission().catch(() => undefined);
      update({ askedNotif: true });
    })();
  }, [native, userId, moodToday, askedNotif, update]);

  // Keep the next 7 reminders queued with the right verse, time and language.
  useEffect(() => {
    if (!native) return;
    ensureChannels()
      .then(() => scheduleDailyReminders({ enabled: reminder, hour: reminderHour, minute: reminderMinute, lang, translation }))
      .catch((e) => console.warn('reminders', e));
  }, [native, reminder, reminderHour, reminderMinute, lang, translation, askedNotif]);

  // Tapping a notification opens what it is about (cold start included).
  const last = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const url = last?.notification.request.content.data?.url;
    if (typeof url === 'string' && userId) router.push(url as Href);
  }, [last, userId]);

  // New direct messages → local notification (while the app is running).
  useEffect(() => {
    if (!native || !userId || !messageAlerts) return;
    const channel = supabase
      .channel(`notify-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, async (payload) => {
        const m = payload.new as api.Message;
        if (m.sender_id === openChat.partnerId) return;
        const sender = await api.getProfile(m.sender_id).catch(() => null);
        const body = m.verse_id ? `📖 ${VERSE_MAP[m.verse_id]?.text.tb.title ?? translate(lang, 'sentVerse')}` : m.body ?? '';
        notifyNow(`${translate(lang, 'newMessageFrom')} ${sender?.display_name ?? 'Selah'}`, body, { url: `/chat/${m.sender_id}` });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [native, userId, messageAlerts, lang]);

  return null;
}
