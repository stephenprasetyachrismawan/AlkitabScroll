import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { UI_FONT } from '../lib/fonts';
import { EASE_IN_OUT } from '../lib/motion';
import { useSettings } from '../lib/settings';
import { passageText, type Verse } from '../lib/verses';
import { Glass } from './Glass';
import { PressableScale } from './PressableScale';
import { YouTubeEmbed } from './YouTubeEmbed';

// Verified peaceful instrumental worship videos (titles checked via YouTube oEmbed).
export const SELAH_VIDEOS = [
  'gRdEnEueCDU', // Be Still With The Lord: 1 Hour Instrumental Worship — Serene Sessions
  'vELBkxa-8EQ', // Quiet Time with God: 1 Hour Instrumental Worship — Serene Sessions
  'IjDqtwd3miY', // Remember His Goodness: 1 hour of Instrumental Worship — Serene Sessions
  'PFLT7G_qZ_4', // Piano Songs for Peace — In His Presence
  '0MhFIOKIRjo', // Pray: 1 Hour Piano Instrumental — DappyTKeys Piano Worship
  'z6vR_FV7s7c', // Worship Piano Instrumental for Prayer — Jerry Kim
];

const BREATH_MS = 4000;

type Props = {
  width: number;
  height: number;
  bottomInset?: number;
  index: number;
  verse: Verse;
  onContinue: () => void;
  onEnough: () => void;
};

/** A slow breathing glow: 4s in, 4s out. Still when the system asks for reduced motion. */
function Breath() {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: BREATH_MS, easing: EASE_IN_OUT, reduceMotion: ReduceMotion.System }), -1, true);
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + p.value * 0.35, transform: [{ scale: 0.85 + p.value * 0.3 }] }));
  return <Animated.View pointerEvents="none" style={[styles.breath, style]} />;
}

export function SelahBreak({ width, height, bottomInset = 0, index, verse, onContinue, onEnough }: Props) {
  const { t, translation } = useSettings();
  const videoW = Math.min(width - 56, 520);
  const { body, title } = passageText(verse, translation);

  return (
    <LinearGradient colors={['#1A1830', '#2A2242', '#3B2D52']} style={[styles.root, { width, height, paddingBottom: bottomInset }]}>
      <Breath />
      <Text style={styles.kicker}>SELAH</Text>
      <Text style={styles.title}>{t('selahTitle')}</Text>
      <Text style={styles.body}>{t('selahBody')}</Text>
      <Glass dark radius={22} strength={0.3} style={{ padding: 8 }}>
        <YouTubeEmbed videoIds={[SELAH_VIDEOS[index % SELAH_VIDEOS.length]]} width={videoW} height={(videoW * 9) / 16} style={{ borderRadius: 16 }} />
      </Glass>
      <View style={styles.verse}>
        <Text style={styles.verseText} numberOfLines={5}>
          “{body}”
        </Text>
        <Text style={styles.verseRef}>{title}</Text>
      </View>
      <View style={styles.row}>
        <PressableScale onPress={onEnough} style={[styles.btn, styles.ghost]} accessibilityRole="button">
          <Text style={styles.btnText}>{t('enoughToday')}</Text>
        </PressableScale>
        <PressableScale onPress={onContinue} style={[styles.btn, styles.solid]} accessibilityRole="button" haptic>
          <Text style={[styles.btnText, { color: '#2A2242' }]}>{t('continueScroll')}</Text>
        </PressableScale>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14, overflow: 'hidden' },
  breath: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: '#8E7CC3' },
  kicker: { color: '#CDBEF2', fontFamily: UI_FONT.bold, letterSpacing: 5, fontSize: 12 },
  title: { color: '#fff', fontFamily: UI_FONT.title, fontSize: 26, textAlign: 'center' },
  body: { color: '#E6DFF6', fontFamily: UI_FONT.serif, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 480 },
  verse: { maxWidth: 480, alignItems: 'center', gap: 6 },
  verseText: { color: '#F6F2FF', fontFamily: 'Lora_500Medium_Italic', fontSize: 15, lineHeight: 23, textAlign: 'center' },
  verseRef: { color: '#CDBEF2', fontFamily: UI_FONT.serifBold, fontSize: 13 },
  row: { flexDirection: 'row', gap: 12, marginTop: 6 },
  btn: { paddingHorizontal: 20, minHeight: 48, justifyContent: 'center', borderRadius: 999 },
  ghost: { borderWidth: 1, borderColor: 'rgba(205,190,242,0.7)', backgroundColor: 'rgba(255,255,255,0.06)' },
  solid: { backgroundColor: '#F6F2FF' },
  btnText: { color: '#F6F2FF', fontFamily: UI_FONT.bold, fontSize: 14 },
});
