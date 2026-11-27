// iOS home screen + Lock Screen widget: today's verse, one tap for another,
// and a quiet day-streak count. Rendered by WidgetKit through expo-widgets.
//
// Everything the layout needs lives inside the 'widget' function: the widget
// runtime serialises only that body, so module-level constants would be missing.
import {
  AccessoryWidgetBackground,
  Button,
  Gauge,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  gaugeStyle,
  kerning,
  lineLimit,
  lineSpacing,
  minimumScaleFactor,
  padding,
  textCase,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
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
  const url = pick.id ? `selah://post/${encodeURIComponent(pick.id)}` : 'selah://';
  const family = env.widgetFamily ?? 'systemMedium';

  // ── Lock Screen: system tints these, so no custom colours ──────────────
  if (family === 'accessoryInline') {
    return (
      <HStack modifiers={[widgetURL(url), containerBackground('clear', 'widget')]}>
        <Image systemName="book.closed" />
        <Text>{props.streak > 1 ? `${pick.book} ${pick.cv} · ${props.streak}` : `${pick.book} ${pick.cv}`}</Text>
      </HStack>
    );
  }

  if (family === 'accessoryCircular') {
    // A ring that fills over a week of opening the app; the reference sits inside.
    return (
      <ZStack modifiers={[widgetURL(url), containerBackground('clear', 'widget')]}>
        <AccessoryWidgetBackground />
        <Gauge value={Math.min(props.streak, 7)} min={0} max={7} modifiers={[gaugeStyle('circularCapacity')]}>
          <VStack spacing={0}>
            <Text modifiers={[font({ size: 11, weight: 'semibold' }), minimumScaleFactor(0.6), lineLimit(1)]}>
              {pick.book}
            </Text>
            <Text modifiers={[font({ size: 10, design: 'rounded' }), minimumScaleFactor(0.6), lineLimit(1)]}>
              {pick.cv}
            </Text>
          </VStack>
        </Gauge>
      </ZStack>
    );
  }

  if (family === 'accessoryRectangular') {
    return (
      <VStack alignment="leading" spacing={1} modifiers={[widgetURL(url), containerBackground('clear', 'widget')]}>
        <HStack spacing={4}>
          <Image systemName="book.closed.fill" modifiers={[font({ size: 11 })]} />
          <Text modifiers={[font({ size: 13, weight: 'semibold' }), lineLimit(1)]}>{pick.ref}</Text>
        </HStack>
        <Text modifiers={[font({ size: 13, design: 'serif' }), lineLimit(2), minimumScaleFactor(0.85)]}>
          {pick.body}
        </Text>
      </VStack>
    );
  }

  // ── Home screen ────────────────────────────────────────────────────────
  const dark = env.colorScheme === 'dark';
  const tinted = env.widgetRenderingMode === 'accented';
  const c = dark
    ? { bg: '#17140F', ink: '#F2ECE3', muted: '#A3998E', accent: '#E2B47C' }
    : { bg: '#FBF7F2', ink: '#1E1A16', muted: '#6F665C', accent: '#9A6A3A' };
  const ink = tinted ? 'primary' : c.ink;
  const muted = tinted ? 'secondary' : c.muted;
  const accent = tinted ? 'primary' : c.accent;

  const label = (
    <Text
      modifiers={[font({ size: 11, weight: 'semibold' }), textCase('uppercase'), kerning(0.8), foregroundStyle(accent), lineLimit(1)]}
    >
      {props.label}
    </Text>
  );

  const streak =
    props.streak > 0 ? (
      <HStack spacing={3}>
        <Image systemName={props.done ? 'flame.fill' : 'flame'} color={accent} modifiers={[font({ size: 11 })]} />
        <Text modifiers={[font({ size: 12, weight: 'semibold', design: 'rounded' }), foregroundStyle(accent)]}>
          {String(props.streak)}
        </Text>
      </HStack>
    ) : null;

  const next =
    props.picks.length > 1 ? (
      <Button
        target="next"
        onPress={() => ({ ...props, i: (props.i + 1) % props.picks.length })}
        modifiers={[buttonStyle('plain')]}
      >
        <HStack spacing={4}>
          <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(accent)]}>{props.next}</Text>
          <Image systemName="arrow.right" color={accent} modifiers={[font({ size: 11, weight: 'semibold' })]} />
        </HStack>
      </Button>
    ) : null;

  const root = [containerBackground(c.bg, 'widget'), widgetURL(url)];

  if (family === 'systemSmall') {
    return (
      <VStack alignment="leading" spacing={6} modifiers={root}>
        <HStack>
          {label}
          <Spacer />
          {streak}
        </HStack>
        <Text
          modifiers={[font({ size: 15, design: 'serif' }), foregroundStyle(ink), lineLimit(5), minimumScaleFactor(0.8), lineSpacing(1)]}
        >
          {pick.body}
        </Text>
        <Spacer minLength={0} />
        <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle(muted), lineLimit(1), minimumScaleFactor(0.8)]}>
          {pick.ref}
        </Text>
      </VStack>
    );
  }

  const large = family === 'systemLarge' || family === 'systemExtraLarge';

  return (
    <VStack alignment="leading" spacing={large ? 12 : 8} modifiers={root}>
      <HStack spacing={6}>
        {label}
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted), lineLimit(1)]}>{props.date}</Text>
        <Spacer />
        {streak}
      </HStack>
      <Text
        modifiers={[
          font({ size: large ? 21 : 16, design: 'serif' }),
          foregroundStyle(ink),
          lineLimit(large ? 11 : 4),
          minimumScaleFactor(0.85),
          lineSpacing(large ? 4 : 2),
          frame({ maxWidth: 10000, alignment: 'leading' }),
        ]}
      >
        {pick.body}
      </Text>
      <Spacer minLength={0} />
      {large && props.streak > 0 ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted), padding({ bottom: 2 })]}>
          {`${props.streak} ${props.streakLabel}`}
        </Text>
      ) : null}
      <HStack spacing={6}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(ink), lineLimit(1), minimumScaleFactor(0.8)]}>
          {pick.ref}
        </Text>
        <Text modifiers={[font({ size: 11, weight: 'medium' }), foregroundStyle(muted)]}>{props.tr}</Text>
        <Spacer />
        {next}
      </HStack>
    </VStack>
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
