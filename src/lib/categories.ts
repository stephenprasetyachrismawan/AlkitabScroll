// Categories and their visual language.
// Colour choices follow common colour-psychology associations
// (blue = calm/comfort, green = peace/growth, gold = hope/light, rose = love, ...).

export type FontKey = 'lora' | 'playfair' | 'nunito' | 'caveat' | 'cormorant';

export type CategoryStyle = {
  gradient: [string, string, string];
  text: string;
  accent: string;
  fonts: FontKey[]; // rotated per verse for variety
};

export type Category = {
  key: string;
  emoji: string;
  label: { id: string; en: string };
  light: CategoryStyle;
  dark: CategoryStyle;
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
  label: { id, en },
  light: { gradient: light, text: lightText, accent, fonts },
  dark: { gradient: dark, text: '#F7F3EC', accent, fonts },
});

export const CATEGORIES: Category[] = [
  c('comfort', '🕊️', 'Penghiburan', 'Comfort', ['#E3EEF9', '#C9DDF2', '#B3CDEB'], ['#14243A', '#1B3150', '#223C60'], '#1D3557', '#4A7BB7', ['lora', 'cormorant']),
  c('hope', '🌅', 'Pengharapan', 'Hope', ['#FFF1DE', '#FFD9B0', '#FBC08A'], ['#2E1D12', '#4A2C17', '#5E3A1D'], '#5A3214', '#E07B39', ['playfair', 'lora']),
  c('strength', '⛰️', 'Kekuatan', 'Strength', ['#E4E8EE', '#C7D0DC', '#A9B6C8'], ['#0F1A2A', '#18263B', '#22344D'], '#162A43', '#34568B', ['playfair', 'nunito']),
  c('peace', '🌿', 'Damai', 'Peace', ['#EAF3EA', '#D3E7D3', '#BBD9BD'], ['#132219', '#1B3022', '#22402C'], '#1F4029', '#5B9A6B', ['lora', 'caveat']),
  c('rest', '🌙', 'Perhentian', 'Rest', ['#EEEAF6', '#DCD3EE', '#C9BDE4'], ['#191529', '#231D3A', '#2D254B'], '#352A5C', '#7B68B5', ['cormorant', 'lora']),
  c('love', '🤍', 'Kasih', 'Love', ['#FCEBEE', '#F7D3DA', '#F0B9C4'], ['#2B1419', '#3E1C24', '#52242F'], '#6B1F33', '#D45A78', ['playfair', 'caveat']),
  c('faith', '✝️', 'Iman', 'Faith', ['#ECE9F7', '#D6D0F0', '#BFB6E6'], ['#16132B', '#1F1A3D', '#29224F'], '#2C2366', '#5E4FB3', ['cormorant', 'playfair']),
  c('wisdom', '📜', 'Hikmat', 'Wisdom', ['#F8F1E2', '#EFE0C2', '#E4CDA0'], ['#241C10', '#352816', '#46351C'], '#4A3515', '#B08A3E', ['cormorant', 'lora']),
  c('forgiveness', '💧', 'Pengampunan', 'Forgiveness', ['#F2F8FC', '#DCEDF8', '#C4E1F3'], ['#0F1E28', '#152A38', '#1B3648'], '#16405C', '#3C8DBC', ['lora', 'nunito']),
  c('gratitude', '🍂', 'Syukur', 'Gratitude', ['#FFF3E6', '#FDDDBE', '#F8C493'], ['#2A1A0E', '#3D2512', '#503016'], '#6A3A12', '#D9822B', ['caveat', 'playfair']),
  c('protection', '🛡️', 'Perlindungan', 'Protection', ['#E3F1F1', '#C5E1E1', '#A6D0D0'], ['#0E2223', '#133031', '#183E40'], '#114446', '#2F8F8F', ['playfair', 'lora']),
  c('provision', '🌾', 'Pemeliharaan', 'Provision', ['#F7F4E3', '#ECE5BF', '#DFD39A'], ['#22200F', '#312D15', '#403A1B'], '#4A4214', '#A39231', ['lora', 'nunito']),
  c('courage', '🔥', 'Keberanian', 'Courage', ['#FDE9E4', '#F9CBBE', '#F3A996'], ['#2C110C', '#401812', '#541F17'], '#6E1E12', '#E0533A', ['playfair', 'nunito']),
  c('perseverance', '🏃', 'Ketekunan', 'Perseverance', ['#F8ECE4', '#EED3C2', '#E2B89D'], ['#26170F', '#372115', '#482B1B'], '#5A2E15', '#B5653A', ['nunito', 'playfair']),
  c('joy', '☀️', 'Sukacita', 'Joy', ['#FFF9DB', '#FFEFA6', '#FFE275'], ['#2A2508', '#3B330C', '#4C4210'], '#5C4A00', '#E0A800', ['caveat', 'nunito']),
  c('guidance', '🕯️', 'Pimpinan', 'Guidance', ['#FBF5E6', '#F2E4BE', '#E6D093'], ['#1A1710', '#282214', '#362E19'], '#4D3D12', '#C9A227', ['cormorant', 'lora']),
  c('relationships', '🤝', 'Relasi & Keluarga', 'Relationships', ['#FFEFE8', '#FFD8C8', '#FFC0A8'], ['#2A1610', '#3D2017', '#502A1E'], '#6B2E1A', '#E5734C', ['nunito', 'caveat']),
  c('work', '🛠️', 'Pekerjaan', 'Work', ['#ECEEF0', '#D5DADF', '#BCC4CC'], ['#15191D', '#1E242A', '#272F37'], '#2B3640', '#5C7080', ['nunito', 'lora']),
  c('identity', '👑', 'Identitas', 'Identity', ['#FBF4E0', '#F3E2B3', '#EACE84'], ['#1C160A', '#2A210E', '#382C12'], '#4F3B08', '#C79A1E', ['playfair', 'cormorant']),
  c('prayer', '🙏', 'Doa', 'Prayer', ['#E9EAF6', '#CFD2EE', '#B4B9E4'], ['#12142A', '#1A1D3C', '#22264E'], '#22285E', '#5560B8', ['cormorant', 'caveat']),
  c('salvation', '✨', 'Keselamatan', 'Salvation', ['#FBEAEA', '#F4CACA', '#EAA6A6'], ['#260E0E', '#381414', '#4A1A1A'], '#5E1414', '#B83232', ['playfair', 'lora']),
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
