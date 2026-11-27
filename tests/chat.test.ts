// Run: npm test
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRows,
  dayLabel,
  displayBody,
  groupReactions,
  kindOf,
  previewText,
  quickReplies,
  toggleReaction,
  type ChatMessage,
} from '../src/lib/chat.ts';

const ME = 'me';
const YOU = 'you';
const at = (h: number, m: number, day = 27) => new Date(2026, 10, day, h, m).toISOString();
let n = 0;
const msg = (from: string, created_at: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id: ++n,
  sender_id: from,
  recipient_id: from === ME ? YOU : ME,
  body: 'hai',
  verse_id: null,
  read_at: null,
  created_at,
  ...extra,
});

test('rows: day separators and runs from one sender', () => {
  const list = [msg(YOU, at(9, 0, 26)), msg(ME, at(9, 0)), msg(ME, at(9, 1)), msg(ME, at(9, 10)), msg(YOU, at(9, 11))];
  const rows = buildRows(list, ME, 'id', new Date(2026, 10, 27, 12));
  assert.deepEqual(
    rows.map((r) => (r.type === 'day' ? r.label : `${r.mine ? 'M' : 'Y'}${r.first ? 'f' : ''}${r.last ? 'l' : ''}`)),
    ['Kemarin', 'Yfl', 'Hari ini', 'Mf', 'Ml', 'Mfl', 'Yfl'],
  );
});

test('day labels', () => {
  const now = new Date(2026, 10, 27, 12);
  assert.equal(dayLabel(at(8, 0), 'en', now), 'Today');
  assert.equal(dayLabel(at(8, 0, 24), 'id', now), 'Selasa');
  assert.equal(dayLabel(new Date(2026, 0, 3).toISOString(), 'id', now), '3 Jan');
  assert.equal(dayLabel(new Date(2025, 0, 3).toISOString(), 'en', now), '3 Jan 2025');
});

test('kinds, including prayer requests sent before the migration', () => {
  assert.equal(kindOf({ body: '', verse_id: 'v1' }), 'verse');
  assert.equal(kindOf({ body: 'tolong', verse_id: null, kind: 'prayer' }), 'prayer');
  assert.equal(kindOf({ body: '🕯️ ujian besok', verse_id: null }), 'prayer');
  assert.equal(displayBody({ body: '🕯️ ujian besok', verse_id: null }), 'ujian besok');
  assert.equal(kindOf({ body: '🙏 amin', verse_id: null }), 'text');
});

test('reactions group per emoji in tray order and toggle', () => {
  const r = [
    { message_id: 1, user_id: YOU, emoji: '❤️' },
    { message_id: 1, user_id: ME, emoji: '🙏' },
    { message_id: 1, user_id: YOU, emoji: '🙏' },
  ];
  assert.deepEqual(groupReactions(r, ME)[1], [
    { emoji: '🙏', count: 2, mine: true },
    { emoji: '❤️', count: 1, mine: false },
  ]);
  const off = toggleReaction(r, { message_id: 1, user_id: ME, emoji: '🙏' });
  assert.equal(off.added, false);
  assert.equal(off.next.length, 2);
  const on = toggleReaction(off.next, { message_id: 1, user_id: ME, emoji: '🔥' });
  assert.equal(on.added, true);
});

test('quick replies follow what the other person sent', () => {
  assert.equal(quickReplies(undefined, ME, 'id').length, 3);
  assert.deepEqual(quickReplies(msg(ME, at(9, 0)), ME, 'id'), []);
  assert.equal(quickReplies(msg(YOU, at(9, 0), { kind: 'prayer' }), ME, 'id')[0].react, '🙏');
  assert.equal(quickReplies(msg(YOU, at(9, 0), { verse_id: 'v1', body: '' }), ME, 'en')[0].label, 'Amen 🙏');
});

test('previews', () => {
  assert.equal(previewText({ body: '', verse_id: 'v1' }, () => 'Mazmur 23:1', 'id'), '📖 Mazmur 23:1');
  assert.equal(previewText({ body: 'kerja', verse_id: null, kind: 'prayer' }, () => undefined, 'id'), '🕯️ Permintaan doa: kerja');
});
