// Light client-side profanity filter for comments and messages.
// Server-side reports + blocks remain the real safety net.
const WORDS = [
  // Words that also appear in Scripture (e.g. "babi", "anjing") are left out on purpose.
  'bangsat', 'kontol', 'memek', 'ngentot', 'goblok', 'bajingan', 'keparat', 'jancok', 'jancuk', 'kampret',
  'fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'cunt', 'whore', 'slut',
];

const pattern = new RegExp(`\\b(${WORDS.join('|')})\\b`, 'gi');

export function cleanText(input: string): string {
  return input.replace(pattern, (w) => w[0] + '*'.repeat(w.length - 1));
}
