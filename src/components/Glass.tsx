import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  dark: boolean;
  /** 0–1: how opaque the frosted layer is. */
  strength?: number;
  radius?: number;
};

/**
 * Glossy glass surface: frosted layer + top sheen + hairline highlight.
 * Real blur on iOS/web; on Android a translucent layer (true Android blur needs a
 * BlurTargetView around the whole screen, too costly behind a scrolling feed).
 */
export function Glass({ children, style, dark, strength = 0.6, radius = 24 }: Props) {
  const tint = dark ? `rgba(28,24,22,${0.35 + strength * 0.4})` : `rgba(255,255,255,${0.35 + strength * 0.4})`;
  const border = dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.85)';
  return (
    <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: border }, style]}>
      {Platform.OS === 'android' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      ) : (
        <>
          <BlurView intensity={40 + strength * 50} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.55 }]} />
        </>
      )}
      {/* sheen: light catching the top edge */}
      <LinearGradient
        pointerEvents="none"
        colors={dark ? ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}
