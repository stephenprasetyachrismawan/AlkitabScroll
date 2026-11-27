// Android "Taman iman" widget: a plant that grows with the day streak, from a
// seed to a tree in bloom, under a sky that follows the time of day.
//
// Everything the layout needs lives inside the 'widget' function: the widget
// runtime serialises only that body, so module-level constants would be missing.
import { Box, Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, fillMaxWidth, height, padding, paddingAll, size } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { GardenWidgetProps } from '../lib/widgetData';

const GardenWidget = (props: GardenWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const hour = new Date().getHours();
  const period = hour >= 5 && hour < 10 ? 0 : hour >= 10 && hour < 16 ? 1 : hour >= 16 && hour < 19 ? 2 : 3;
  // dawn, day, dusk, night
  const sky = dark ? ['#2A2119', '#1B2230', '#2C1D18', '#101421'] : ['#FCE9D2', '#E4EEF6', '#F7D9C4', '#2B3350'];
  const nightSky = period === 3;
  const ink = dark || nightSky ? '#F2ECE3' : '#1E1A16';
  const muted = dark || nightSky ? '#B9B0A4' : '#6F665C';
  const accent = dark || nightSky ? '#E2B47C' : '#9A6A3A';
  const orb = nightSky ? '#F4E9C8' : period === 2 ? '#F08A4B' : '#F6C445';
  const S = 1.15;

  return (
    <Column modifiers={[fillMaxSize(), cornerRadius(22), background(sky[period]), paddingAll(14)]}>
      <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
        <Text color={accent} maxLines={1} style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: 0.8 }}>
          {props.title.toUpperCase()}
        </Text>
        <Text color={muted} maxLines={1} style={{ fontSize: 11 }}>
          {props.streak > 0 ? `  ·  ${props.streak} ${props.dayLabel}` : ''}
        </Text>
      </Row>
      <Box modifiers={[fillMaxWidth(), height(80 * S + 4)]} contentAlignment="bottomCenter">
        <Box modifiers={[fillMaxSize(), padding(0, 2, 6, 0)]} contentAlignment="topEnd">
          <Box modifiers={[size(16, 16), cornerRadius(8), background(orb)]} />
        </Box>
        <Box modifiers={[size(96 * S, 80 * S)]}>
          {props.art.map((group, gi) => (
            <Box key={gi} modifiers={[fillMaxSize()]}>
              {group.map(([x, y, w, h, r, col], i) => (
                <Box key={i} modifiers={[padding(x * S, y * S, 0, 0)]}>
                  <Box modifiers={[size(w * S, h * S), cornerRadius(r * S), background(col)]} />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
      <Spacer modifiers={[height(4)]} />
      <Text color={ink} maxLines={1} style={{ fontSize: 14, fontWeight: 'bold' }}>
        {props.stageName}
      </Text>
      {props.nextLine ? (
        <Text color={muted} maxLines={2} style={{ fontSize: 11 }}>
          {props.nextLine}
        </Text>
      ) : null}
    </Column>
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
