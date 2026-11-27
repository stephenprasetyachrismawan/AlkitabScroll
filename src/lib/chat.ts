// Pure helpers for the chat screen: grouping, day labels, reactions, quick replies.
// No React or Supabase imports, so `npm test` can run them under plain Node.

export type ChatKind = 'text' | 'verse' | 'prayer';

export type ChatMessage = {
  id: number;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  verse_id: string | null;
  read_at: string | null;
  created_at: string;
  kind?: ChatKind;
  reply_to?: number | null;
};

export type ChatReaction = { message_id: number; user_id: string; emoji: string };

/** The reactions offered on long-press. 🙏 first: it's the one that means the most here. */
export const REACTIONS = ['🙏', '❤️', '🔥', '🕊️', '😊', '😢'] as const;

/** Double-tap a bubble to say amen. */
export const QUICK_REACTION = '🙏';

/** Prayer requests sent before migration 0002 travel as text starting with this mark (see api.ts). */
export const PRAYER_MARK = '🕯️ ';

/** Kind of a message, including prayer requests sent before the kind column existed. */
export function kindOf(m: Pick<ChatMessage, 'kind' | 'verse_id' | 'body'>): ChatKind {
  if (m.kind === 'prayer') return 'prayer';
  if (m.verse_id) return 'verse';
  if (m.body?.startsWith(PRAYER_MARK)) return 'prayer';
  return m.kind ?? 'text';
}

/** Body text without the fallback prayer mark. */
export function displayBody(m: Pick<ChatMessage, 'kind' | 'verse_id' | 'body'>): string {
  const b = m.body ?? '';
  return kindOf(m) === 'prayer' && b.startsWith(PRAYER_MARK) ? b.slice(PRAYER_MARK.length) : b;
}

/** A message sits close to its neighbour when the same person sent both within 3 minutes. */
const GROUP_GAP_MS = 3 * 60_000;

export type Row =
  | { type: 'day'; key: string; label: string }
  | {
      type: 'msg';
      key: string;
      message: ChatMessage;
      mine: boolean;
      /** first of a run from one sender: gets the top margin */
      first: boolean;
      /** last of a run: gets the tail and the time */
      last: boolean;
    };

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

const MONTHS = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const DAYS = {
  id: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

/** "Hari ini", "Kemarin", a weekday within the week, else "12 Okt" (with year if not this year). */
export function dayLabel(iso: string, lang: 'id' | 'en', now = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return lang === 'id' ? 'Hari ini' : 'Today';
  if (diff === 1) return lang === 'id' ? 'Kemarin' : 'Yesterday';
  if (diff > 1 && diff < 7) return DAYS[lang][d.getDay()];
  const base = `${d.getDate()} ${MONTHS[lang][d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Oldest-first messages → rows with day separators and run flags, oldest first. */
export function buildRows(messages: ChatMessage[], me: string, lang: 'id' | 'en', now = new Date()): Row[] {
  const rows: Row[] = [];
  let lastDay = '';
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const day = dayKey(m.created_at);
    if (day !== lastDay) {
      rows.push({ type: 'day', key: `d-${day}`, label: dayLabel(m.created_at, lang, now) });
      lastDay = day;
    }
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const joins = (a?: ChatMessage, b?: ChatMessage) =>
      !!a &&
      !!b &&
      a.sender_id === b.sender_id &&
      dayKey(a.created_at) === dayKey(b.created_at) &&
      Math.abs(new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) < GROUP_GAP_MS;
    rows.push({
      type: 'msg',
      key: String(m.id),
      message: m,
      mine: m.sender_id === me,
      first: !joins(prev, m),
      last: !joins(m, next),
    });
  }
  return rows;
}

export type ReactionChip = { emoji: string; count: number; mine: boolean };

/** Reactions grouped per message, then per emoji in the tray's order. */
export function groupReactions(reactions: ChatReaction[], me: string): Record<number, ReactionChip[]> {
  const by: Record<number, Map<string, ReactionChip>> = {};
  for (const r of reactions) {
    const m = (by[r.message_id] ??= new Map());
    const chip = m.get(r.emoji) ?? { emoji: r.emoji, count: 0, mine: false };
    chip.count += 1;
    if (r.user_id === me) chip.mine = true;
    m.set(r.emoji, chip);
  }
  const order = (e: string) => {
    const i = (REACTIONS as readonly string[]).indexOf(e);
    return i < 0 ? REACTIONS.length : i;
  };
  const out: Record<number, ReactionChip[]> = {};
  for (const [id, m] of Object.entries(by)) out[Number(id)] = [...m.values()].sort((a, b) => order(a.emoji) - order(b.emoji));
  return out;
}

/** Add or take away one reaction, the way the server will end up. */
export function toggleReaction(list: ChatReaction[], r: ChatReaction): { next: ChatReaction[]; added: boolean } {
  const same = (x: ChatReaction) => x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji;
  if (list.some(same)) return { next: list.filter((x) => !same(x)), added: false };
  return { next: [...list, r], added: true };
}

export type QuickReply = { label: string; body: string; react?: string };

/**
 * Short answers offered above the keyboard, chosen from what the other person last sent.
 * A prayer request gets "I'm praying"; a verse gets amen; an empty chat gets a greeting.
 */
export function quickReplies(last: ChatMessage | undefined, me: string, lang: 'id' | 'en'): QuickReply[] {
  const id = lang === 'id';
  if (!last) {
    return id
      ? [
          { label: 'Syalom 👋', body: 'Syalom! 👋' },
          { label: 'Apa kabar?', body: 'Apa kabar hari ini?' },
          { label: 'Ada yang bisa kudoakan?', body: 'Ada yang bisa kudoakan untukmu?' },
        ]
      : [
          { label: 'Shalom 👋', body: 'Shalom! 👋' },
          { label: 'How are you?', body: 'How are you today?' },
          { label: 'How can I pray for you?', body: 'How can I pray for you?' },
        ];
  }
  if (last.sender_id === me) return [];
  const kind = kindOf(last);
  if (kind === 'prayer') {
    return id
      ? [
          { label: 'Aku doakan 🙏', body: 'Aku doakan ya 🙏', react: '🙏' },
          { label: 'Tuhan menyertaimu', body: 'Tuhan menyertaimu. Kamu tidak sendiri.' },
        ]
      : [
          { label: 'Praying 🙏', body: "I'm praying for you 🙏", react: '🙏' },
          { label: 'God is with you', body: "God is with you. You're not alone." },
        ];
  }
  if (kind === 'verse') {
    return id
      ? [
          { label: 'Amin 🙏', body: 'Amin 🙏', react: '🙏' },
          { label: 'Menguatkan sekali', body: 'Ayat ini menguatkan sekali, makasih ❤️' },
          { label: 'Pas banget', body: 'Pas banget buat hari ini.' },
        ]
      : [
          { label: 'Amen 🙏', body: 'Amen 🙏', react: '🙏' },
          { label: 'So encouraging', body: 'This verse is so encouraging, thank you ❤️' },
          { label: 'Right on time', body: 'Exactly what I needed today.' },
        ];
  }
  return id
    ? [
        { label: 'Amin 🙏', body: 'Amin 🙏' },
        { label: 'Tuhan memberkati', body: 'Tuhan memberkati 🕊️' },
      ]
    : [
        { label: 'Amen 🙏', body: 'Amen 🙏' },
        { label: 'God bless', body: 'God bless 🕊️' },
      ];
}

/** One-line preview for the inbox and notifications. */
export function previewText(
  m: { body: string | null; verse_id: string | null; kind?: ChatKind | null },
  verseTitle: (id: string) => string | undefined,
  lang: 'id' | 'en',
): string {
  const kind = kindOf({ body: m.body, verse_id: m.verse_id, kind: m.kind ?? undefined });
  if (kind === 'verse' && m.verse_id) return `📖 ${verseTitle(m.verse_id) ?? (lang === 'id' ? 'Ayat' : 'Verse')}`;
  if (kind === 'prayer') return `🕯️ ${lang === 'id' ? 'Permintaan doa' : 'Prayer request'}: ${displayBody(m as ChatMessage)}`;
  return m.body ?? '';
}
