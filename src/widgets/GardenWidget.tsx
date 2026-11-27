// Web (and type-check) fallback. iOS and Android load GardenWidget.ios.tsx /
// GardenWidget.android.tsx; expo-widgets is a no-op on web.
import { createWidget } from 'expo-widgets';
import type { GardenWidgetProps } from '../lib/widgetData';

export default createWidget<GardenWidgetProps>('GardenWidget', () => null as never);
