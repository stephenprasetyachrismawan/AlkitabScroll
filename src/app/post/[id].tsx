import { useLocalSearchParams } from 'expo-router';
import { Feed } from '../../components/Feed';

/** Opens one verse (from Liked/Saved/DM); scrolling on continues with the algorithm. */
export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Feed startVerseId={id} />;
}
