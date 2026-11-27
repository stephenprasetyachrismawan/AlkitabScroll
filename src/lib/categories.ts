// Categories and their visual language.
// Colour choices follow common colour-psychology associations
// (blue = calm/comfort, green = peace/growth, gold = hope/light, rose = love, ...).
// Cards are flat, printed-paper tints: each hue is mixed into the app's parchment
// so nothing reads as a glossy gradient. No violet anywhere (taste-skill).

export type FontKey = 'lora' | 'roman' | 'caveat';

export type CategoryStyle = {
  /** source hues; `paper` is what the interface paints */
  gradient: [string, string, string];
  /** flat card ground: the hue mixed into parchment */
  paper: string;
  /** a step deeper than paper: chips, wells */
  well: string;
  text: string;
  accent: string;
  fonts: FontKey[]; // rotated per verse for variety
};

const PAPER_LIGHT = '#F7F1E3';
const PAPER_DARK = '#1A1612';

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}

export type Category = {
  key: string;
  emoji: string;
  /** Ionicons glyph name (icons, not emoji, in the interface) */
  icon: string;
  label: { id: string; en: string };
  light: CategoryStyle;
  dark: CategoryStyle;
};

const ICONS: Record<string, string> = {
  comfort: 'cloud-outline',
  hope: 'sunny-outline',
  strength: 'barbell-outline',
  peace: 'leaf-outline',
  rest: 'moon-outline',
  love: 'heart-outline',
  faith: 'star-outline',
  wisdom: 'book-outline',
  forgiveness: 'water-outline',
  gratitude: 'gift-outline',
  protection: 'shield-outline',
  provision: 'basket-outline',
  courage: 'flame-outline',
  perseverance: 'trending-up-outline',
  joy: 'happy-outline',
  guidance: 'compass-outline',
  relationships: 'people-outline',
  work: 'briefcase-outline',
  identity: 'finger-print-outline',
  prayer: 'chatbubbles-outline',
  salvation: 'sparkles-outline',
};

const c = (
  key: string,
  emoji: string,
  id: string,
  en: string,
  light: [string, string, string],
  dark: [string, string, string],
  lightText: string,
  accent: string,
  fonts: FontKey[],
): Category => ({
  key,
  emoji,
  icon: ICONS[key] ?? 'book-outline',
  label: { id, en },
  light: { gradient: light, paper: mix(light[1], PAPER_LIGHT, 0.45), well: mix(light[2], PAPER_LIGHT, 0.3), text: lightText, accent, fonts },
  dark: { gradient: dark, paper: mix(dark[1], PAPER_DARK, 0.25), well: mix(dark[2], PAPER_DARK, 0.1), text: '#F7F1E3', accent: mix(accent, '#FFFFFF', 0.25), fonts },
});

export const CATEGORIES: Category[] = [
  c('comfort', '🕊️', 'Penghiburan', 'Comfort', ['#E3EEF9', '#C9DDF2', '#B3CDEB'], ['#14243A', '#1B3150', '#223C60'], '#1D3557', '#4A7BB7', ['lora', 'roman']),
  c('hope', '🌅', 'Pengharapan', 'Hope', ['#FFF1DE', '#FFD9B0', '#FBC08A'], ['#2E1D12', '#4A2C17', '#5E3A1D'], '#5A3214', '#E07B39', ['roman', 'lora']),
  c('strength', '⛰️', 'Kekuatan', 'Strength', ['#E4E8EE', '#C7D0DC', '#A9B6C8'], ['#0F1A2A', '#18263B', '#22344D'], '#162A43', '#34568B', ['roman', 'lora']),
  c('peace', '🌿', 'Damai', 'Peace', ['#EAF3EA', '#D3E7D3', '#BBD9BD'], ['#132219', '#1B3022', '#22402C'], '#1F4029', '#5B9A6B', ['lora', 'caveat']),
  c('rest', '🌙', 'Perhentian', 'Rest', ['#E6EAF0', '#CFD8E3', '#B8C5D6'], ['#121A24', '#18222F', '#1F2C3B'], '#1F2E40', '#4D6A8C', ['lora', 'roman']),
  c('love', '🤍', 'Kasih', 'Love', ['#FCEBEE', '#F7D3DA', '#F0B9C4'], ['#2B1419', '#3E1C24', '#52242F'], '#6B1F33', '#D45A78', ['roman', 'caveat']),
  c('faith', '✝️', 'Iman', 'Faith', ['#F7E9DF', '#EDD3C2', '#E0BBA2'], ['#2A1A12', '#3B2418', '#4C2E1F'], '#5A2A12', '#A0522D', ['lora', 'roman']),
  c('wisdom', '📜', 'Hikmat', 'Wisdom', ['#F8F1E2', '#EFE0C2', '#E4CDA0'], ['#241C10', '#352816', '#46351C'], '#4A3515', '#B08A3E', ['lora', 'roman']),
  c('forgiveness', '💧', 'Pengampunan', 'Forgiveness', ['#F2F8FC', '#DCEDF8', '#C4E1F3'], ['#0F1E28', '#152A38', '#1B3648'], '#16405C', '#3C8DBC', ['lora', 'roman']),
  c('gratitude', '🍂', 'Syukur', 'Gratitude', ['#FFF3E6', '#FDDDBE', '#F8C493'], ['#2A1A0E', '#3D2512', '#503016'], '#6A3A12', '#D9822B', ['caveat', 'roman']),
  c('protection', '🛡️', 'Perlindungan', 'Protection', ['#E3F1F1', '#C5E1E1', '#A6D0D0'], ['#0E2223', '#133031', '#183E40'], '#114446', '#2F8F8F', ['roman', 'lora']),
  c('provision', '🌾', 'Pemeliharaan', 'Provision', ['#F7F4E3', '#ECE5BF', '#DFD39A'], ['#22200F', '#312D15', '#403A1B'], '#4A4214', '#A39231', ['lora', 'roman']),
  c('courage', '🔥', 'Keberanian', 'Courage', ['#FDE9E4', '#F9CBBE', '#F3A996'], ['#2C110C', '#401812', '#541F17'], '#6E1E12', '#E0533A', ['roman', 'lora']),
  c('perseverance', '🏃', 'Ketekunan', 'Perseverance', ['#F8ECE4', '#EED3C2', '#E2B89D'], ['#26170F', '#372115', '#482B1B'], '#5A2E15', '#B5653A', ['roman', 'lora']),
  c('joy', '☀️', 'Sukacita', 'Joy', ['#FFF9DB', '#FFEFA6', '#FFE275'], ['#2A2508', '#3B330C', '#4C4210'], '#5C4A00', '#E0A800', ['caveat', 'roman']),
  c('guidance', '🕯️', 'Pimpinan', 'Guidance', ['#FBF5E6', '#F2E4BE', '#E6D093'], ['#1A1710', '#282214', '#362E19'], '#4D3D12', '#C9A227', ['lora', 'roman']),
  c('relationships', '🤝', 'Relasi & Keluarga', 'Relationships', ['#FFEFE8', '#FFD8C8', '#FFC0A8'], ['#2A1610', '#3D2017', '#502A1E'], '#6B2E1A', '#E5734C', ['roman', 'caveat']),
  c('work', '🛠️', 'Pekerjaan', 'Work', ['#ECEEF0', '#D5DADF', '#BCC4CC'], ['#15191D', '#1E242A', '#272F37'], '#2B3640', '#5C7080', ['roman', 'lora']),
  c('identity', '👑', 'Identitas', 'Identity', ['#FBF4E0', '#F3E2B3', '#EACE84'], ['#1C160A', '#2A210E', '#382C12'], '#4F3B08', '#C79A1E', ['roman', 'lora']),
  c('prayer', '🙏', 'Doa', 'Prayer', ['#E8ECEF', '#D2DAE0', '#BAC6CF'], ['#141B21', '#1B242C', '#232E38'], '#22313E', '#56708A', ['lora', 'caveat']),
  c('salvation', '✨', 'Keselamatan', 'Salvation', ['#FBEAEA', '#F4CACA', '#EAA6A6'], ['#260E0E', '#381414', '#4A1A1A'], '#5E1414', '#B83232', ['roman', 'lora']),
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(CATEGORIES.map((x) => [x.key, x]));

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
