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
};

const LIGHT: Palette = {
  bg: '#FAF7F2',
  card: '#FFFFFF',
  text: '#1F1B16',
  muted: '#7A7064',
  border: '#E8E1D6',
  primary: '#8B5E34',
  danger: '#C0392B',
};

const DARK: Palette = {
  bg: '#12100E',
  card: '#1C1916',
  text: '#F3EEE6',
  muted: '#A39A8E',
  border: '#2E2924',
  primary: '#D9A86C',
  danger: '#E5675A',
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
