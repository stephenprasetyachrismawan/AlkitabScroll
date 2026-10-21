import { Image, Text, View } from 'react-native';
import type { Profile } from '../lib/api';
import { hashString } from '../lib/categories';
import { UI_FONT } from '../lib/fonts';

const COLORS = ['#8B5E34', '#4A7BB7', '#5B9A6B', '#D45A78', '#7B68B5', '#E07B39', '#2F8F8F'];

export function Avatar({ profile, size = 36, ring }: { profile?: Profile | null; size?: number; ring?: string }) {
  const name = profile?.display_name ?? '?';
  const border = ring ? { borderWidth: 2.5, borderColor: ring, padding: 2 } : null;
  const inner = size - (ring ? 9 : 0);
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }, border]}>
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={{ width: inner, height: inner, borderRadius: inner / 2 }} />
      ) : (
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: COLORS[hashString(profile?.id ?? name) % COLORS.length],
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontFamily: UI_FONT.bold, fontSize: inner * 0.42 }}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
    </View>
  );
}
