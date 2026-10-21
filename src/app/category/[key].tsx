import { Stack, useLocalSearchParams } from 'expo-router';
import { Feed } from '../../components/Feed';
import { CATEGORY_MAP } from '../../lib/categories';
import { useSettings } from '../../lib/settings';

export default function CategoryFeed() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const { lang } = useSettings();
  const c = CATEGORY_MAP[key];
  return (
    <>
      <Stack.Screen options={{ title: c ? `${c.emoji} ${c.label[lang]}` : '' }} />
      <Feed category={key} />
    </>
  );
}
