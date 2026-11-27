// Android home screen widget (Glance via expo-widgets): today's verse,
// one tap for another, the day streak, and Selo, whose face follows the streak
// and who sleeps at night. The ground warms and cools with the time of day.
// Android phones have no Lock Screen widgets; the daily reminder notification
// covers the Lock Screen there.
//
// Everything the layout needs lives inside the 'widget' function: the widget
// runtime serialises only that body, so module-level constants would be missing.
import { Box, Column, Row, Spacer, Text, TextButton } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, height, padding, size } from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { VerseWidgetProps } from '../lib/widgetData';

const VerseWidget = (props: VerseWidgetProps, env: WidgetEnvironment) => {
  'widget';
  const pick = props.picks[props.i % Math.max(1, props.picks.length)] ?? {
    id: '',
    ref: 'Selah',
    book: 'Selah',
    cv: '',
    body: '',
  };
  // Text sizes are sp, so the phone's font size multiplies them, but the widget box does not
  // grow. Let text grow up to 1.2x, then shrink sizes back, and show fewer verse lines.
  const fs = Math.max(1, props.fs ?? 1);
  const k = Math.min(fs, 1.2) / fs;
  const sz = (n: number) => Math.round(n * k * 10) / 10;
  const bodyLines = fs > 1.3 ? 3 : 4;
  const dark = env.colorScheme === 'dark';
  const hour = new Date().getHours();
  const period = hour >= 5 && hour < 10 ? 0 : hour >= 10 && hour < 16 ? 1 : hour >= 16 && hour < 19 ? 2 : 3;
  // dawn, day, dusk, night
  const grounds = dark ? ['#241D16', '#17140F', '#271A15', '#121620'] : ['#FCEFD9', '#FBF7F2', '#F8E3D0', '#E9ECF4'];
  const c = dark
    ? { bg: grounds[period], ink: '#F2ECE3', muted: '#A3998E', accent: '#E2B47C' }
    : { bg: grounds[period], ink: '#1E1A16', muted: '#6F665C', accent: '#9A6A3A' };

  const night = period === 3 && (hour >= 22 || hour < 5);
  const selo = props.selo;
  const art = selo ? (night ? selo.night : selo.art) : [];
  const S = 60 / 64;

  return (
    <Box modifiers={[fillMaxSize(), cornerRadius(22), background(c.bg)]}>
      <Column modifiers={[fillMaxSize(), padding(16, 16, selo ? 84 : 16, 16)]}>
        <Row verticalAlignment="center">
          <Text color={c.accent} maxLines={1} style={{ fontSize: sz(11), fontWeight: 'bold', letterSpacing: 0.8 }}>
            {props.label.toUpperCase()}
          </Text>
          <Text color={c.muted} maxLines={1} style={{ fontSize: sz(11) }}>
            {props.date ? `  ·  ${props.date}` : ''}
          </Text>
        </Row>
        <Spacer modifiers={[height(8)]} />
        <Text color={c.ink} maxLines={bodyLines} overflow="ellipsis" style={{ fontSize: sz(16), lineHeight: sz(23) }}>
          {pick.body}
        </Text>
        <Spacer modifiers={[height(8)]} />
        <Text color={c.ink} maxLines={1} style={{ fontSize: sz(13), fontWeight: 'bold' }}>
          {`${pick.ref}  ·  ${props.tr}`}
        </Text>
        <Row verticalAlignment="center">
          {props.picks.length > 1 ? (
            <TextButton
              colors={{ contentColor: c.accent }}
              contentPadding={{ start: 0, top: 4, end: 12, bottom: 4 }}
              onClick={(() => ({ ...props, i: (props.i + 1) % props.picks.length })) as () => void}
            >
              <Text color={c.accent} style={{ fontSize: sz(12), fontWeight: 'bold' }}>
                {`${props.next} →`}
              </Text>
            </TextButton>
          ) : null}
          {props.streak > 0 ? (
            <Text color={c.muted} maxLines={1} style={{ fontSize: sz(12) }}>
              {`${props.streak} ${props.streakLabel}`}
            </Text>
          ) : null}
        </Row>
      </Column>
      {selo ? (
        <Box modifiers={[fillMaxSize(), padding(0, 14, 12, 12)]} contentAlignment="topEnd">
          <Column horizontalAlignment="center" modifiers={[size(68, 110)]}>
            <Box modifiers={[size(64 * S, 64 * S)]}>
              {art.map((group, gi) => (
                <Box key={gi} modifiers={[fillMaxSize()]}>
                  {group.map(([x, y, w, h, r, col], i) => (
                    <Box key={i} modifiers={[padding(x * S, y * S, 0, 0)]}>
                      <Box modifiers={[size(w * S, h * S), cornerRadius(r * S), background(col)]} />
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
            <Text color={c.muted} maxLines={3} style={{ fontSize: sz(10), textAlign: 'center' }}>
              {night ? `${selo.nightLine} z z` : selo.line}
            </Text>
          </Column>
        </Box>
      ) : null}
    </Box>
  );
};

export default createWidget<VerseWidgetProps>('VerseWidget', VerseWidget, {
  label: 'Ayat hari ini',
  date: '',
  tr: 'TB',
  next: 'Ayat lain',
  streakLabel: 'hari berturut-turut',
  streak: 0,
  done: false,
  i: 0,
  picks: [
    {
      id: '',
      ref: 'Mazmur 46:11',
      book: 'Mzm',
      cv: '46:11',
      body: 'Diamlah dan ketahuilah, bahwa Akulah Allah!',
    },
  ],
  selo: null,
});
