// Web (and type-check) fallback. iOS and Android load VerseWidget.ios.tsx /
// VerseWidget.android.tsx; expo-widgets is a no-op on web.
import { createWidget } from 'expo-widgets';
import type { VerseWidgetProps } from '../lib/widgetData';

export default createWidget<VerseWidgetProps>('VerseWidget', () => null as never);
