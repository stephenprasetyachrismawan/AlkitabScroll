import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '../lib/settings';

/** Soft pearl/lilac/sky wash behind screens, so glass surfaces have something to catch. */
export function Aurora() {
  const { colors, dark } = useSettings();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={colors.aurora} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.blob, { top: -120, right: -80, backgroundColor: dark ? '#3A2A55' : '#F3D9C4' }]} />
      <View style={[styles.blob, { bottom: -140, left: -100, backgroundColor: dark ? '#173548' : '#D6E6F7' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.45 },
});
