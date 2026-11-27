// Curhat notes: what the user wrote and the verses Selah found for it.
// Private by design: kept in this phone's storage only, never sent to the server.
import './storage';
import { useSyncExternalStore } from 'react';
import { forms, normalize, tokenize } from './search';

export type CurhatNote = {
  id: string;
  text: string;
  /** ISO time */
  at: string;
  /** verses found when it was saved, best first */
  verseIds: string[];
  /** themes (category keys) Selah read in it */
  themes: string[];
};

const KEY = 'selah.curhat.v1';
const MAX_NOTES = 300;

let notes: CurhatNote[] = load();
const listeners = new Set<() => void>();

function load(): CurhatNote[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CurhatNote[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function commit(next: CurhatNote[]) {
  notes = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  listeners.forEach((l) => l());
}

export function useCurhatNotes(): CurhatNote[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => notes,
  );
}

export function addNote(text: string, verseIds: string[], themes: string[]): CurhatNote {
  const note: CurhatNote = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    text: text.trim(),
    at: new Date().toISOString(),
    verseIds: verseIds.slice(0, 12),
    themes: themes.slice(0, 4),
  };
  commit([note, ...notes].slice(0, MAX_NOTES));
  return note;
}

export function deleteNote(id: string) {
  commit(notes.filter((n) => n.id !== id));
}

/** Notes whose words share a root with every word of the query ("kerja" finds "pekerjaanku"). */
export function filterNotes(list: CurhatNote[], query: string): CurhatNote[] {
  const q = tokenize(query).filter((w) => w.length >= 2);
  if (!q.length) return list;
  const qForms = q.map((w) => forms(w));
  return list.filter((n) => {
    const own = new Set(tokenize(n.text).flatMap((w) => forms(w)));
    return qForms.every((fs) => fs.some((f) => own.has(f)) || normalize(n.text).includes(fs[0]));
  });
}

/**
 * Themes that keep coming back across recent notes, weighted toward the newest
 * (a note loses half its weight every 7 days).
 */
export function recurringThemes(list: CurhatNote[], now = Date.now()): string[] {
  const w = new Map<string, number>();
  for (const n of list.slice(0, 30)) {
    const age = (now - new Date(n.at).getTime()) / 86_400_000;
    const k = Math.pow(0.5, age / 7);
    n.themes.forEach((t, i) => w.set(t, (w.get(t) ?? 0) + k / (i + 1)));
  }
  return [...w.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}
