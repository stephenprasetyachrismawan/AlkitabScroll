// Device-local sowing progress (see sowing.ts). Shares are counted when the share
// action finishes, a reached stage waits in `pending` until a surface shows it.
import './storage';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { todayKey } from './algorithm';
import { EMPTY_SOWING, sow, unlockedThemes, type ShareChannel, type SowingState, type SowResult, type Stage } from './sowing';
import { FREE_THEMES } from './shareCards';

const KEY = 'selah.sowing';

type Ctx = {
  state: SowingState;
  /** themes the user can use */
  hasTheme: (key: string) => boolean;
  sowSeed: (channel: ShareChannel, verseId: string) => SowResult;
  /** a stage reached and not yet celebrated */
  pending: Stage | null;
  clearPending: () => void;
  /** the share sheet celebrates inside its own modal; the global card waits meanwhile */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
};

const SowingContext = createContext<Ctx | null>(null);

function load(): SowingState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...EMPTY_SOWING, ...JSON.parse(raw) };
  } catch {}
  return EMPTY_SOWING;
}

export function SowingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SowingState>(load);
  const [pending, setPending] = useState<Stage | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const ref = useRef(state);

  const sowSeed = useCallback((channel: ShareChannel, verseId: string) => {
    const r = sow(ref.current, channel, verseId, todayKey());
    if (r.counted) {
      ref.current = r.state;
      setState(r.state);
      try {
        localStorage.setItem(KEY, JSON.stringify(r.state));
      } catch {}
      if (r.reached) setPending(r.reached);
    }
    return r;
  }, []);

  const unlocked = useMemo(() => unlockedThemes(state.total), [state.total]);
  const hasTheme = useCallback((k: string) => FREE_THEMES.has(k) || unlocked.has(k), [unlocked]);
  const clearPending = useCallback(() => setPending(null), []);

  const value = useMemo<Ctx>(
    () => ({ state, hasTheme, sowSeed, pending, clearPending, sheetOpen, setSheetOpen }),
    [state, hasTheme, sowSeed, pending, clearPending, sheetOpen],
  );
  return <SowingContext.Provider value={value}>{children}</SowingContext.Provider>;
}

export function useSowing() {
  const ctx = useContext(SowingContext);
  if (!ctx) throw new Error('useSowing outside provider');
  return ctx;
}
