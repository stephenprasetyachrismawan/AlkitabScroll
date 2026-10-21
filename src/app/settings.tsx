import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  const confirmDelete = () =>
    Alert.alert(t('deleteAccount'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('yes'), style: 'destructive', onPress: () => api.deleteMyAccount().catch(() => Alert.alert('Selah', t('errorGeneric'))) },
    ]);

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, gap: 22 }}>
      <Stack.Screen options={{ title: t('settings') }} />
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
  option: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13 },
  optionText: { fontFamily: UI_FONT.semibold, fontSize: 15 },
  note: { fontFamily: UI_FONT.regular, fontSize: 11, paddingBottom: 12, lineHeight: 16 },
  action: { borderWidth: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 13 },
});
