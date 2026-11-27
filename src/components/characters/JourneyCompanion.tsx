// Puts Selo beside the story figures on the journey. Registered once at startup through the
// journey's `setFigureRenderer` hook, so the journey screens stay unaware of the cast.
import { View } from 'react-native';
import { setFigureRenderer, FigureMedallion, type FigureMood, type FigureProps } from '../journey/StoryFigure';
import type { Action } from '../../lib/characters';
import { useSettings } from '../../lib/settings';
import { Character } from './CharacterStage';

const SELO_ACTION: Record<FigureMood, Action> = { idle: 'wave', think: 'pray', cheer: 'hop', sad: 'sleep' };

/**
 * Selo only joins the big lesson figures (96px intro, 120px finish). The 36px quiz badge and the
 * 58px figures on the path are absolutely placed beside a node, where a wider row would crowd it.
 */
const MIN_SIZE = 90;

function FigureWithSelo({ figure, mood, size, label }: FigureProps) {
  const { characters } = useSettings();
  if (!characters || size < MIN_SIZE) return <FigureMedallion figure={figure} mood={mood} size={size} label={label} />;
  const selo = Math.round(size * 0.62);
  return (
    <View style={{ width: size + selo * 0.55, alignItems: 'flex-start' }}>
      <FigureMedallion figure={figure} mood={mood} size={size} label={label} />
      <Character
        scene={{ character: 'selo', action: SELO_ACTION[mood] }}
        size={selo}
        playing
        style={{ position: 'absolute', right: 0, bottom: -selo * 0.12 }}
      />
    </View>
  );
}

setFigureRenderer((p) => <FigureWithSelo {...p} />);
