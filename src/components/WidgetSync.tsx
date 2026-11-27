import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSettings } from '../lib/settings';
import { syncWidgets } from '../lib/widgets';

/** Invisible: refreshes the widgets on launch, on return to the app and when language or translation change. */
export function WidgetSync() {
  const { translation, lang } = useSettings();

  useEffect(() => {
    syncWidgets({ translation, lang });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncWidgets({ translation, lang });
    });
    return () => sub.remove();
  }, [translation, lang]);

  return null;
}
