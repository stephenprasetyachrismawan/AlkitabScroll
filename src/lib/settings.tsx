import './storage';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getLocales } from 'expo-localization';
import type { Lang, StringKey } from './i18n';
import { translate } from './i18n';
import type { Translation } from './verses';

export type ThemePref = 'system' | 'light' | 'dark';
export type ViewMode = 'post' | 'reels';

type Settings = {
  lang: Lang;
  translation: Translation;
  theme: ThemePref;
  viewMode: ViewMode;
  /** calm instrumental audio while scrolling the feed */
  music: boolean;
  reminder: boolean;
  reminderHour: number;
  reminderMinute: number;
  messageAlerts: boolean;
  /** we asked for notification permission once already */
  askedNotif: boolean;
  /** animated characters (Selo and friends) on verse cards */
  characters: boolean;
};

export type Palette = {
  /** page ground: warm paper */
  bg: string;
  /** raised things: cards, sheets, inputs */
  card: string;
  /** a step darker than the ground: wells, idle chips */
  surface: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  /** text on the primary colour */
  onPrimary: string;
  /** the ledge under a chunky button: primary, a few steps darker */
  ledge: string;
  danger: string;
  success: string;
  /** tinted wash used for selected / active states */
  primarySoft: string;
};

// Tokens from taste-skill's brand dealer, fed the app's own colours
// (adaptive-icon parchment #F2E4BE and the notification brown #9A6A3A):
// bg #f7f1e3, surface #ebe5d7, ink #221d17, muted #655f56, accent #9a6a3a.
const LIGHT: Palette = {
  bg: '#F7F1E3',
  card: '#FFFBF2',
  surface: '#EBE5D7',
  text: '#221D17',
  muted: '#655F56',
  border: '#DED6C5',
  primary: '#9A6A3A',
  onPrimary: '#FFFFFF',
  ledge: '#6E4A26',
  danger: '#B3402E',
  success: '#4F7A3A',
  primarySoft: 'rgba(154,106,58,0.13)',
};

const DARK: Palette = {
  bg: '#1A1612',
  card: '#26211B',
  surface: '#2E2923',
  text: '#F7F1E3',
  muted: '#A39C90',
  border: '#3A342C',
  primary: '#D9A66B',
  onPrimary: '#221D17',
  ledge: '#9A6A3A',
  danger: '#E2735F',
  success: '#8DBA6E',
  primarySoft: 'rgba(217,166,107,0.16)',
};

type Ctx = Settings & {
  dark: boolean;
  colors: Palette;
  t: (key: StringKey) => string;
  update: (patch: Partial<Settings>) => void;
};

const SettingsContext = createContext<Ctx | null>(null);
const STORAGE_KEY = 'selah.settings';

function load(): Settings {
  const deviceLang: Lang = getLocales()[0]?.languageCode === 'id' ? 'id' : 'en';
  const defaults: Settings = {
    lang: deviceLang,
    translation: deviceLang === 'id' ? 'tb' : 'kjv',
    theme: 'system',
    viewMode: 'reels',
    music: true,
    reminder: true,
    reminderHour: 7,
    reminderMinute: 0,
    messageAlerts: true,
    askedNotif: false,
    characters: true,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load);
  const system = useColorScheme();
  const dark = settings.theme === 'system' ? system === 'dark' : settings.theme === 'dark';

  const value = useMemo<Ctx>(
    () => ({
      ...settings,
      dark,
      colors: dark ? DARK : LIGHT,
      t: (key) => translate(settings.lang, key),
      update: (patch) =>
        setSettings((prev) => {
          const next = { ...prev, ...patch };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        }),
    }),
    [settings, dark],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside provider');
  return ctx;
}
