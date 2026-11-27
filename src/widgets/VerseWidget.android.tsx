// Android home screen widget (Glance via expo-widgets): today's verse,
// one tap for another, and the day streak. Android phones have no Lock Screen
// widgets; the daily reminder notification covers the Lock Screen there.
//
// Everything the layout needs lives inside the 'widget' function: the widget
// runtime serialises only that body, so module-level constants would be missing.
import { Column, Row, Spacer, Text, TextButton } from '@expo/ui/jetpack-compose';
import { background, cornerRadius, fillMaxSize, height, paddingAll } from '@expo/ui/jetpack-compose/modifiers';
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
  const c =
    env.colorScheme === 'dark'
      ? { bg: '#17140F', ink: '#F2ECE3', muted: '#A3998E', accent: '#E2B47C' }
      : { bg: '#FBF7F2', ink: '#1E1A16', muted: '#6F665C', accent: '#9A6A3A' };

  return (
    <Column modifiers={[fillMaxSize(), cornerRadius(22), background(c.bg), paddingAll(16)]}>
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
            <Text color={c.accent} maxLines={1} style={{ fontSize: sz(12), fontWeight: 'bold' }}>
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
});
