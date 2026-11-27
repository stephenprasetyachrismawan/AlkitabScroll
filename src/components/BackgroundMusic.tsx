import { useEffect, useState } from 'react';
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
  // The player is a whole WebView. Start it a moment after the feed has drawn so it never
  // competes with the first frames, and only once there is something to play.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (mounted || !playing) return;
    const id = setTimeout(() => setMounted(true), START_DELAY_MS);
    return () => clearTimeout(id);
  }, [mounted, playing]);
  if (!mounted) return null;
  return (
    <View pointerEvents="none" style={styles.hidden} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <YouTubeEmbed videoIds={ids} width={2} height={2} playing={playing} volume={35} showControls={false} />
    </View>
  );
}

const START_DELAY_MS = 1200;

const styles = StyleSheet.create({
  // Must stay attached and on-screen (Android pauses fully off-screen WebViews), but unseen.
  hidden: { position: 'absolute', left: 0, top: 0, width: 2, height: 2, opacity: 0.01, zIndex: -1 },
});
