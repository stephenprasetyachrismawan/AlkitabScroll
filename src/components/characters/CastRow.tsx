// The whole cast side by side, each doing its signature move (Settings).
import { StyleSheet, Text, View } from 'react-native';
import { CAST, type Scene } from '../../lib/characters';
import { UI_FONT } from '../../lib/fonts';
import { useSettings } from '../../lib/settings';
import { Character } from './CharacterStage';

const LINEUP: Scene[] = [
  { character: 'selo', action: 'wave' },
  { character: 'dara', action: 'fly' },
  { character: 'arka', action: 'stand' },
  { character: 'pipi', action: 'peck' },
  { character: 'lumi', action: 'glow' },
];

export function CastRow() {
  const { colors } = useSettings();
  return (
    <View style={styles.row}>
      {LINEUP.map((scene) => (
        <View key={scene.character} style={styles.cell}>
          <Character scene={scene} size={56} playing />
          <Text style={[styles.name, { color: colors.muted }]}>{CAST[scene.character].name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12 },
  cell: { alignItems: 'center', gap: 2 },
  name: { fontFamily: UI_FONT.bold, fontSize: 11 },
});
