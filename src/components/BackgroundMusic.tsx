import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SELAH_VIDEOS } from './SelahBreak';
import { YouTubeEmbed } from './YouTubeEmbed';

/**
 * Calm instrumental audio under the feed. The YouTube player is kept tiny and
 * invisible behind the content, so only the sound comes through.
 */
export function BackgroundMusic({ playing }: { playing: boolean }) {
  // Shuffle once per mount so each session starts with a different piece.
  const [ids] = useState(() => [...SELAH_VIDEOS].sort(() => Math.random() - 0.5));
  return (
    <View pointerEvents="none" style={styles.hidden} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <YouTubeEmbed videoIds={ids} width={2} height={2} playing={playing} volume={35} showControls={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Must stay attached and on-screen (Android pauses fully off-screen WebViews), but unseen.
  hidden: { position: 'absolute', left: 0, top: 0, width: 2, height: 2, opacity: 0.01, zIndex: -1 },
});
