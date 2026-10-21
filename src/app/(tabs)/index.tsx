import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aurora } from '../../components/Aurora';
import { Feed } from '../../components/Feed';
import { Glass } from '../../components/Glass';
import { ModeSwitch } from '../../components/ModeSwitch';
import { StatusRow } from '../../components/StatusRow';
import { useEngagement } from '../../lib/engagement';
import { UI_FONT } from '../../lib/fonts';
import { MOOD_MAP } from '../../lib/moods';
import { useSettings } from '../../lib/settings';

export default function Home() {
  const { colors, viewMode, update, dark } = useSettings();
  const { moodToday } = useEngagement();
  const insets = useSafeAreaInsets();
  const reels = viewMode === 'reels';
  const fg = reels ? (dark ? '#fff' : '#1E1A16') : colors.text;

  const bar = (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }, reels && styles.barOverlay]}>
      <Text style={[styles.logo, { color: fg }]}>Selah</Text>
      <View style={styles.right}>
        {moodToday ? (
          <Glass dark={dark} radius={22} strength={0.6} style={styles.mood}>
            <Text style={styles.moodEmoji}>{MOOD_MAP[moodToday]?.emoji}</Text>
          </Glass>
        ) : null}
        <ModeSwitch mode={viewMode} onChange={(m) => update({ viewMode: m })} dark={dark} accent={colors.primary} />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Aurora />
      {!reels ? bar : null}
      <Feed header={<StatusRow />} />
      {reels ? bar : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  barOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  logo: { fontFamily: UI_FONT.title, fontSize: 28, letterSpacing: 0.3 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mood: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  moodEmoji: { fontSize: 22 },
});
