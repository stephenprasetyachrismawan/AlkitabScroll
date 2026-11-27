// iOS "Taman iman" widget: a plant that grows with the day streak, from a seed
// to a tree in bloom, under a sky that follows the time of day. The medium size
// adds Selo, whose face follows the streak.
//
// Everything the layout needs lives inside the 'widget' function: the widget
// runtime serialises only that body, so module-level constants would be missing.
import { Circle, HStack, RoundedRectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  frame,
  kerning,
  lineLimit,
  minimumScaleFactor,
  offset,
  textCase,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { GardenWidgetProps } from '../lib/widgetData';

const GardenWidget = (props: GardenWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const tinted = env.widgetRenderingMode === 'accented';
  const hour = (env.date ?? new Date()).getHours();
  const period = hour >= 5 && hour < 10 ? 0 : hour >= 10 && hour < 16 ? 1 : hour >= 16 && hour < 19 ? 2 : 3;
  const sky = dark ? ['#2A2119', '#1B2230', '#2C1D18', '#101421'] : ['#FCE9D2', '#E4EEF6', '#F7D9C4', '#2B3350'];
  const nightSky = period === 3;
  const ink = tinted ? 'primary' : dark || nightSky ? '#F2ECE3' : '#1E1A16';
  const muted = tinted ? 'secondary' : dark || nightSky ? '#B9B0A4' : '#6F665C';
  const accent = tinted ? 'primary' : dark || nightSky ? '#E2B47C' : '#9A6A3A';
  const orb = nightSky ? '#F4E9C8' : period === 2 ? '#F08A4B' : '#F6C445';
  const night = hour >= 22 || hour < 5;
  const family = env.widgetFamily ?? 'systemSmall';

  const art = (boxes: [number, number, number, number, number, string][], w: number, h: number, S: number) => (
    <ZStack alignment="topLeading" modifiers={[frame({ width: w * S, height: h * S, alignment: 'topLeading' })]}>
      {boxes.map(([x, y, bw, bh, r, col], i) => (
        <RoundedRectangle
          key={i}
          cornerRadius={r * S}
          modifiers={[foregroundStyle(tinted ? 'primary' : col), frame({ width: bw * S, height: bh * S }), offset({ x: x * S, y: y * S })]}
        />
      ))}
    </ZStack>
  );

  const garden = (S: number) => (
    <ZStack alignment="topTrailing">
      {art(props.art.flat(), 96, 80, S)}
      <Circle modifiers={[foregroundStyle(tinted ? 'secondary' : orb), frame({ width: 14, height: 14 })]} />
    </ZStack>
  );

  const header = (
    <HStack spacing={4}>
      <Text modifiers={[font({ size: 11, weight: 'semibold' }), textCase('uppercase'), kerning(0.8), foregroundStyle(accent), lineLimit(1)]}>
        {props.title}
      </Text>
      <Spacer />
      {props.streak > 0 ? (
        <Text modifiers={[font({ size: 12, weight: 'semibold', design: 'rounded' }), foregroundStyle(accent)]}>{String(props.streak)}</Text>
      ) : null}
    </HStack>
  );

  const words = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle(ink), lineLimit(1), minimumScaleFactor(0.8)]}>
        {props.stageName}
      </Text>
      {props.nextLine ? (
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(2), minimumScaleFactor(0.8)]}>{props.nextLine}</Text>
      ) : null}
    </VStack>
  );

  const root = [containerBackground(sky[period], 'widget'), widgetURL('selah://')];

  if (family === 'systemMedium' && props.selo) {
    return (
      <HStack spacing={12} modifiers={root}>
        <VStack alignment="leading" spacing={6}>
          {header}
          {garden(1.15)}
        </VStack>
        <VStack alignment="leading" spacing={6}>
          {art((night ? props.selo.night : props.selo.art).flat(), 64, 64, 0.9)}
          {words}
          <Text modifiers={[font({ size: 10 }), foregroundStyle(muted), lineLimit(2)]}>
            {night ? `${props.selo.nightLine} z z` : props.selo.line}
          </Text>
        </VStack>
      </HStack>
    );
  }

  return (
    <VStack alignment="leading" spacing={4} modifiers={root}>
      {header}
      <HStack>
        <Spacer />
        {garden(1)}
        <Spacer />
      </HStack>
      {words}
    </VStack>
  );
};

export default createWidget<GardenWidgetProps>('GardenWidget', GardenWidget, {
  title: 'Taman iman',
  stageName: 'Benih',
  stage: 0,
  streak: 0,
  done: false,
  dayLabel: 'hari',
  nextLine: 'Buka Selah besok, benihmu bertunas',
  art: [],
  selo: null,
});
