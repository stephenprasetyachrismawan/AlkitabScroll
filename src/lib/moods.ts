// Daily mood ("Moody") and the categories each mood points the feed toward.
// Weights are relative within one mood.

export type MoodKey = 'happy' | 'sad' | 'anxious' | 'tired' | 'angry' | 'grateful';

export type Mood = {
  key: MoodKey;
  emoji: string;
  label: { id: string; en: string };
  categories: Record<string, number>;
};

export const MOODS: Mood[] = [
  {
    key: 'happy',
    emoji: '😊',
    label: { id: 'Senang', en: 'Happy' },
    categories: { joy: 3, gratitude: 3, love: 2, work: 1, relationships: 1 },
  },
  {
    key: 'sad',
    emoji: '😢',
    label: { id: 'Sedih', en: 'Sad' },
    categories: { comfort: 4, hope: 3, love: 2, joy: 1 },
  },
  {
    key: 'anxious',
    emoji: '😰',
    label: { id: 'Cemas', en: 'Anxious' },
    categories: { peace: 4, protection: 3, faith: 2, provision: 2, prayer: 1 },
  },
  {
    key: 'tired',
    emoji: '😩',
    label: { id: 'Lelah', en: 'Tired' },
    categories: { rest: 4, strength: 3, perseverance: 2, hope: 1 },
  },
  {
    key: 'angry',
    emoji: '😠',
    label: { id: 'Marah', en: 'Angry' },
    categories: { peace: 3, forgiveness: 3, wisdom: 2, love: 1, relationships: 1 },
  },
  {
    key: 'grateful',
    emoji: '🙏',
    label: { id: 'Bersyukur', en: 'Grateful' },
    categories: { gratitude: 4, joy: 2, salvation: 2, provision: 1, identity: 1 },
  },
];

export const MOOD_MAP: Record<string, Mood> = Object.fromEntries(MOODS.map((m) => [m.key, m]));
