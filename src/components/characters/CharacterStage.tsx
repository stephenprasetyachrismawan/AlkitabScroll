// Picks the character and action for a verse and renders it.
import { memo, useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { CAST, sceneForVerse, type CharacterKey, type Scene } from '../../lib/characters';
import type { Verse } from '../../lib/verses';
import { Arka } from './Arka';
import { Dara } from './Dara';
import type { CharacterProps } from './kit';
import { Lumi } from './Lumi';
import { Pipi } from './Pipi';
import { Selo } from './Selo';

const COMPONENTS: Record<CharacterKey, React.ComponentType<CharacterProps>> = {
  selo: Selo,
  dara: Dara,
  arka: Arka,
  pipi: Pipi,
  lumi: Lumi,
};

export function Character({ scene, size, playing, style }: { scene: Scene; size: number; playing: boolean; style?: ViewStyle }) {
  const C = COMPONENTS[scene.character];
  return (
    <View
      pointerEvents="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel={CAST[scene.character].name}
      style={[{ width: size, height: size }, style]}
    >
      <C size={size} action={scene.action} playing={playing} />
    </View>
  );
}

/** The character that belongs to this verse, acting out its theme. */
export const VerseCharacter = memo(function VerseCharacter({
  verse,
  size,
  playing,
  style,
}: {
  verse: Verse;
  size: number;
  playing: boolean;
  style?: ViewStyle;
}) {
  const scene = useMemo(() => sceneForVerse(verse), [verse]);
  return <Character scene={scene} size={size} playing={playing} style={style} />;
});
