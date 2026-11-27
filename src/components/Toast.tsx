import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UI_FONT } from '../lib/fonts';
import { DURATION, enter, timing } from '../lib/motion';
import { useSettings } from '../lib/settings';

type Toast = { id: number; text: string; icon?: keyof typeof Ionicons.glyphMap };
const ToastContext = createContext<(text: string, icon?: Toast['icon']) => void>(() => {});

const HOLD_MS = 1700;

/** One small note at a time, rising above the tab bar, then leaving on its own. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = useCallback((text: string, icon?: Toast['icon']) => setToast((t) => ({ id: (t?.id ?? 0) + 1, text, icon })), []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDone={() => setToast((t) => (t?.id === toast.id ? null : t))} /> : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

function ToastView({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();
  const p = useSharedValue(0);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    p.value = withTiming(1, enter(420));
    const out = setTimeout(() => {
      p.value = withTiming(0, timing(DURATION.quick));
    }, HOLD_MS);
    const end = setTimeout(() => done.current(), HOLD_MS + DURATION.quick + 40);
    return () => {
      clearTimeout(out);
      clearTimeout(end);
    };
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 16 }] }));
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 92 }]}>
      <Animated.View style={[styles.pill, { backgroundColor: colors.text }, style]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        {toast.icon ? <Ionicons name={toast.icon} size={17} color={colors.bg} /> : null}
        <Text style={[styles.text, { color: colors.bg }]}>{toast.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, maxWidth: 420 },
  text: { fontFamily: UI_FONT.semibold, fontSize: 14 },
});
