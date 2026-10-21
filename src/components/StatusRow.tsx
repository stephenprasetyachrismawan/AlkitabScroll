import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth';
import { UI_FONT } from '../lib/fonts';
import { useSettings } from '../lib/settings';
import { Avatar } from './Avatar';

/** Story-style row: me first, then people I follow with an active status. */
export function StatusRow() {
  const { colors, t } = useSettings();
  const { userId, profile } = useAuth();
  const [groups, setGroups] = useState<{ user: api.Profile; count: number }[]>([]);
  const [mine, setMine] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const list = await api.activeStatuses();
        const counts = new Map<string, number>();
        for (const s of list) counts.set(s.user_id, (counts.get(s.user_id) ?? 0) + 1);
        const others = [...counts.keys()].filter((id) => id !== userId);
        const profiles = await api.getProfiles(others);
        if (!alive) return;
        setMine(counts.get(userId ?? '') ?? 0);
        setGroups(others.filter((id) => profiles[id]).map((id) => ({ user: profiles[id], count: counts.get(id)! })));
      })().catch(() => {});
      return () => {
        alive = false;
      };
    }, [userId]),
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}>
      <Pressable
        style={styles.item}
        onPress={() => (mine ? router.push({ pathname: '/status/view', params: { user: userId! } }) : router.push('/status/create'))}
      >
        <View>
          <Avatar profile={profile} size={62} ring={mine ? colors.primary : colors.border} />
          {!mine ? (
            <View style={[styles.plus, { backgroundColor: colors.primary, borderColor: colors.bg }]}>
              <Text style={styles.plusText}>+</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {t('yourStatus')}
        </Text>
      </Pressable>
      {groups.map((g) => (
        <Pressable key={g.user.id} style={styles.item} onPress={() => router.push({ pathname: '/status/view', params: { user: g.user.id } })}>
          <Avatar profile={g.user} size={62} ring={colors.primary} />
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {g.user.display_name.split(' ')[0]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 10, gap: 14 },
  item: { alignItems: 'center', width: 68, gap: 4 },
  name: { fontFamily: UI_FONT.regular, fontSize: 11 },
  plus: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  plusText: { color: '#fff', fontFamily: UI_FONT.bold, fontSize: 14, lineHeight: 16 },
});
