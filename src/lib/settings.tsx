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
};

export type Palette = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  danger: string;
  /** soft background gradient behind glass surfaces */
  aurora: [string, string, string];
  /** tinted wash used for selected / active states */
  primarySoft: string;
};

const LIGHT: Palette = {
  bg: '#FBF7F2',
  card: '#FFFFFF',
  text: '#1E1A16',
  muted: '#6F665C',
  border: '#ECE3D8',
  primary: '#9A6A3A',
  danger: '#C0392B',
  aurora: ['#FDF8F1', '#F5EEF8', '#EAF2FB'],
  primarySoft: 'rgba(154,106,58,0.12)',
};

const DARK: Palette = {
  bg: '#100E14',
  card: '#1B1820',
  text: '#F4EFE8',
  muted: '#A69C92',
  border: '#2C2730',
  primary: '#E2B47C',
  danger: '#EC6F62',
  aurora: ['#120F18', '#1A1426', '#0E1820'],
  primarySoft: 'rgba(226,180,124,0.16)',
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
