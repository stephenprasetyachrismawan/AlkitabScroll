import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UI_FONT } from '../lib/fonts';
import { useSettings } from '../lib/settings';
import { passageText, type Verse } from '../lib/verses';
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

type Props = {
  width: number;
  height: number;
  index: number;
  verse: Verse;
  onContinue: () => void;
  onEnough: () => void;
};

export function SelahBreak({ width, height, index, verse, onContinue, onEnough }: Props) {
  const { t, translation } = useSettings();
  const videoW = Math.min(width - 40, 520);
  const { body, title } = passageText(verse, translation);

  return (
    <LinearGradient colors={['#1B1A2E', '#2A2440', '#3A2E4F']} style={[styles.root, { width, height }]}>
      <Text style={styles.kicker}>⏸ SELAH</Text>
      <Text style={styles.title}>{t('selahTitle')}</Text>
      <Text style={styles.body}>{t('selahBody')}</Text>
      <YouTubeEmbed videoId={SELAH_VIDEOS[index % SELAH_VIDEOS.length]} width={videoW} height={(videoW * 9) / 16} />
      <View style={styles.verse}>
        <Text style={styles.verseText} numberOfLines={5}>
          “{body}”
        </Text>
        <Text style={styles.verseRef}>{title}</Text>
      </View>
      <View style={styles.row}>
        <Pressable style={[styles.btn, styles.ghost]} onPress={onEnough}>
          <Text style={styles.btnText}>{t('enoughToday')}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.solid]} onPress={onContinue}>
          <Text style={[styles.btnText, { color: '#2A2440' }]}>{t('continueScroll')}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 14 },
  kicker: { color: '#C9B8F0', fontFamily: UI_FONT.bold, letterSpacing: 4, fontSize: 12 },
  title: { color: '#fff', fontFamily: UI_FONT.title, fontSize: 26, textAlign: 'center' },
  body: { color: '#E4DDF5', fontFamily: UI_FONT.serif, fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 480 },
  verse: { maxWidth: 480, alignItems: 'center', gap: 6 },
  verseText: { color: '#F5F0FF', fontFamily: 'Lora_500Medium_Italic', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  verseRef: { color: '#C9B8F0', fontFamily: UI_FONT.serifBold, fontSize: 13 },
  row: { flexDirection: 'row', gap: 12, marginTop: 6 },
  btn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
  ghost: { borderWidth: 1, borderColor: '#C9B8F0' },
  solid: { backgroundColor: '#F5F0FF' },
  btnText: { color: '#F5F0FF', fontFamily: UI_FONT.bold, fontSize: 14 },
});
