import { StyleSheet, Text, View } from 'react-native';
import { UI_FONT } from '../lib/fonts';
import { useSettings } from '../lib/settings';

export default function Setup() {
  const { t, colors } = useSettings();
  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <Text style={styles.emoji}>⚙️</Text>
      <Text style={[styles.title, { color: colors.text }]}>{t('setupTitle')}</Text>
      <Text style={[styles.body, { color: colors.muted }]}>{t('setupBody')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emoji: { fontSize: 48 },
  title: { fontFamily: UI_FONT.title, fontSize: 22 },
  body: { fontFamily: UI_FONT.regular, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
