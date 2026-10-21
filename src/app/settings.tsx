import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { notifyNow, permissionState, requestPermission, type PermissionState } from '../lib/notifications';
import { Stack } from 'expo-router';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth';
import { UI_FONT } from '../lib/fonts';
import { useSettings, type ThemePref, type ViewMode } from '../lib/settings';
import { TRANSLATIONS, type Translation } from '../lib/verses';

export default function Settings() {
  const s = useSettings();
  const { t, colors } = s;
  const { signOut } = useAuth();

  const [perm, setPerm] = useState<PermissionState>('undetermined');
  const refreshPerm = useCallback(() => {
    permissionState().then(setPerm).catch(() => {});
  }, []);
  useEffect(refreshPerm, [refreshPerm]);

  const allow = async () => {
    setPerm(await requestPermission());
  };

  const shiftReminder = (mins: number) => {
    const total = (s.reminderHour * 60 + s.reminderMinute + mins + 24 * 60) % (24 * 60);
    s.update({ reminderHour: Math.floor(total / 60), reminderMinute: total % 60 });
  };
  const hhmm = `${String(s.reminderHour).padStart(2, '0')}:${String(s.reminderMinute).padStart(2, '0')}`;

  const confirmDelete = () =>
    Alert.alert(t('deleteAccount'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('yes'), style: 'destructive', onPress: () => api.deleteMyAccount().catch(() => Alert.alert('Selah', t('errorGeneric'))) },
    ]);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 22 }}>
      <Stack.Screen options={{ title: t('settings') }} />
      <Group title={t('notifications')} colors={colors}>
        {perm !== 'granted' && perm !== 'unsupported' ? (
          <View style={{ paddingVertical: 12, gap: 8 }}>
            {perm === 'denied' ? <Text style={[styles.note, { color: colors.muted, paddingBottom: 0 }]}>{t('notifDenied')}</Text> : null}
            <Pressable onPress={perm === 'denied' ? () => Linking.openSettings() : allow} style={[styles.pill, { backgroundColor: colors.primary }]}>
              <Text style={styles.pillText}>{perm === 'denied' ? t('openSettings') : t('notifAllow')}</Text>
            </Pressable>
          </View>
        ) : null}
        <Row label={t('dailyReminder')} colors={colors}>
          <Switch value={s.reminder} onValueChange={(reminder) => s.update({ reminder })} trackColor={{ true: colors.primary }} />
        </Row>
        {s.reminder ? (
          <View style={{ paddingBottom: 12, gap: 10 }}>
            <View style={styles.timeRow}>
              <Pressable onPress={() => shiftReminder(-15)} style={[styles.step, { borderColor: colors.border }]} hitSlop={6}>
                <Text style={[styles.stepText, { color: colors.text }]}>−15</Text>
              </Pressable>
              <Text style={[styles.time, { color: colors.text }]}>{hhmm}</Text>
              <Pressable onPress={() => shiftReminder(15)} style={[styles.step, { borderColor: colors.border }]} hitSlop={6}>
                <Text style={[styles.stepText, { color: colors.text }]}>+15</Text>
              </Pressable>
            </View>
            <View style={styles.chips}>
              {[
                [5, 30],
                [6, 0],
                [7, 0],
                [12, 0],
                [18, 0],
                [21, 0],
              ].map(([h, m]) => {
                const on = s.reminderHour === h && s.reminderMinute === m;
                return (
                  <Pressable
                    key={`${h}${m}`}
                    onPress={() => s.update({ reminderHour: h, reminderMinute: m })}
                    style={[styles.chip, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : 'transparent' }]}
                  >
                    <Text style={{ color: colors.text, fontFamily: UI_FONT.semibold }}>{`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <Row label={t('messageNotif')} colors={colors}>
          <Switch value={s.messageAlerts} onValueChange={(messageAlerts) => s.update({ messageAlerts })} trackColor={{ true: colors.primary }} />
        </Row>
        <Pressable
          onPress={async () => {
            if ((await permissionState()) !== 'granted') {
              await allow();
              refreshPerm();
            }
            await notifyNow('Selah', t('testNotifBody'), { url: '/' });
          }}
          style={styles.option}
        >
          <Text style={[styles.optionText, { color: colors.primary }]}>{t('testNotif')}</Text>
        </Pressable>
      </Group>
      <Group title={t('music')} colors={colors}>
        <Row label={t('musicHint')} colors={colors}>
          <Switch value={s.music} onValueChange={(music) => s.update({ music })} trackColor={{ true: colors.primary }} />
        </Row>
      </Group>
      <Group title={t('language')} colors={colors}>
        <Choice<'id' | 'en'> value={s.lang} onChange={(lang) => s.update({ lang })} options={[['id', 'Bahasa Indonesia'], ['en', 'English']]} colors={colors} />
      </Group>
      <Group title={t('translation')} colors={colors}>
        <Choice<Translation>
          value={s.translation}
          onChange={(translation) => s.update({ translation })}
          options={TRANSLATIONS.map((x) => [x.key, `${x.short} · ${x.name}`])}
          colors={colors}
        />
        <Text style={[styles.note, { color: colors.muted }]}>
          {TRANSLATIONS.map((x) => x.copyright).join('\n')}
          {'\n'}Sumber teks: alkitab.sabda.org
        </Text>
      </Group>
      <Group title={t('viewMode')} colors={colors}>
        <Choice<ViewMode> value={s.viewMode} onChange={(viewMode) => s.update({ viewMode })} options={[['post', t('modePost')], ['reels', t('modeReels')]]} colors={colors} />
      </Group>
      <Group title={t('theme')} colors={colors}>
        <Choice<ThemePref>
          value={s.theme}
          onChange={(theme) => s.update({ theme })}
          options={[['system', t('themeSystem')], ['light', t('themeLight')], ['dark', t('themeDark')]]}
          colors={colors}
        />
      </Group>
      <View style={{ gap: 10 }}>
        <Pressable onPress={signOut} style={[styles.action, { borderColor: colors.border }]}>
          <Text style={{ color: colors.text, fontFamily: UI_FONT.bold }}>{t('signOut')}</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} style={[styles.action, { borderColor: colors.danger }]}>
          <Text style={{ color: colors.danger, fontFamily: UI_FONT.bold }}>{t('deleteAccount')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

type Colors = ReturnType<typeof useSettings>['colors'];

function Group({ title, children, colors }: { title: string; children: React.ReactNode; colors: Colors }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.title, { color: colors.muted }]}>{title}</Text>
      <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

function Row({ label, children, colors }: { label: string; children: React.ReactNode; colors: Colors }) {
  return (
    <View style={styles.option}>
      <Text style={[styles.optionText, { color: colors.text, flex: 1 }]}>{label}</Text>
      {children}
    </View>
  );
}

function Choice<T extends string>({
  value,
  onChange,
  options,
  colors,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
  colors: Colors;
}) {
  return (
    <>
      {options.map(([k, label]) => (
        <Pressable key={k} onPress={() => onChange(k)} style={styles.option}>
          <Text style={[styles.optionText, { color: colors.text }]}>{label}</Text>
          <Text style={{ color: colors.primary, fontSize: 16 }}>{value === k ? '●' : '○'}</Text>
        </Pressable>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: UI_FONT.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  box: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 },
  pill: { borderRadius: 999, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: '#fff', fontFamily: UI_FONT.bold },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  time: { fontFamily: UI_FONT.title, fontSize: 30, minWidth: 100, textAlign: 'center' },
  step: { borderWidth: 1, borderRadius: 14, minWidth: 56, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: UI_FONT.bold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  optionText: { fontFamily: UI_FONT.semibold, fontSize: 15 },
  note: { fontFamily: UI_FONT.regular, fontSize: 11, paddingBottom: 12, lineHeight: 16 },
  action: { borderWidth: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 13 },
});
