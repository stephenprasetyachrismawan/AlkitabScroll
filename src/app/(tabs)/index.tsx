import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Feed } from '../../components/Feed';
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
  const fg = reels ? (dark ? '#fff' : '#1F1B16') : colors.text;

  const bar = (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }, reels ? styles.barOverlay : { backgroundColor: colors.bg }]}>
      <Text style={[styles.logo, { color: fg }]}>Selah</Text>
      <View style={styles.right}>
        {moodToday ? <Text style={styles.mood}>{MOOD_MAP[moodToday]?.emoji}</Text> : null}
        <Pressable
          hitSlop={8}
          onPress={() => update({ viewMode: reels ? 'post' : 'reels' })}
          style={[styles.toggle, { borderColor: fg + '55' }]}
        >
          <Ionicons name={reels ? 'grid-outline' : 'phone-portrait-outline'} size={16} color={fg} />
          <Text style={[styles.toggleText, { color: fg }]}>{reels ? '3:4' : '9:16'}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {!reels ? bar : null}
      <Feed header={<StatusRow />} />
      {reels ? bar : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  barOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  logo: { fontFamily: UI_FONT.title, fontSize: 26 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mood: { fontSize: 22 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  toggleText: { fontFamily: UI_FONT.bold, fontSize: 12 },
});
