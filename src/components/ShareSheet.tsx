import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth';
import { UI_FONT } from '../lib/fonts';
import { useSettings } from '../lib/settings';
import type { Verse } from '../lib/verses';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Glass } from './Glass';
import { PressableScale } from './PressableScale';
import { VerseCard } from './VerseCard';

type Props = { verse: Verse | null; onClose: () => void };

export function ShareSheet({ verse, onClose }: Props) {
  const { t, colors, translation, lang, dark } = useSettings();
  const { userId } = useAuth();
  const [mode, setMode] = useState<'menu' | 'friends'>('menu');
  const [friends, setFriends] = useState<api.Profile[]>([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const shotRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    if (mode !== 'friends' || !userId) return;
    let alive = true;
    (async () => {
      const list = query.trim()
        ? await api.searchProfiles(query)
        : Object.values(await api.getProfiles(await api.followingIds(userId)));
      if (alive) setFriends(list.filter((p) => p.id !== userId));
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [mode, query, userId]);

  if (!verse) return null;

  const close = () => {
    setMode('menu');
    setSentTo(new Set());
    setQuery('');
    onClose();
  };

  const exportImage = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Selah', 'Export is available in the Android app.');
      return;
    }
    try {
      setBusy(true);
      const uri = await captureRef(shotRef, { format: 'png', quality: 1, width: 1080, height: 1920 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('exportImage') });
    } catch {
      Alert.alert('Selah', t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  };

  const send = async (p: api.Profile) => {
    if (!userId) return;
    try {
      await api.sendMessage(userId, p.id, '', verse.id);
      setSentTo((s) => new Set(s).add(p.id));
    } catch {
      Alert.alert('Selah', t('errorGeneric'));
    }
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <Glass dark={dark} radius={28} strength={0.95} style={styles.sheet}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        {mode === 'menu' ? (
          <View style={{ gap: 6 }}>
            <Item icon="paper-plane-outline" label={t('sendToFriend')} onPress={() => setMode('friends')} color={colors.text} accent={colors.primary} />
            <Item
              icon="radio-button-on-outline"
              accent={colors.primary}
              label={t('makeStatus')}
              onPress={() => {
                close();
                router.push({ pathname: '/status/create', params: { verse: verse.id } });
              }}
              color={colors.text}
            />
            <Item icon="image-outline" label={t('exportImage')} onPress={exportImage} color={colors.text} accent={colors.primary} />
            {busy ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <TextInput
              placeholder={t('searchUsers')}
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            />
            <FlatList
              data={friends}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <View style={styles.friend}>
                  <Avatar profile={item} size={40} />
                  <Text style={[styles.friendName, { color: colors.text }]} numberOfLines={1}>
                    {item.display_name}
                  </Text>
                  <Pressable
                    disabled={sentTo.has(item.id)}
                    onPress={() => send(item)}
                    style={[styles.sendBtn, { backgroundColor: sentTo.has(item.id) ? colors.border : colors.primary }]}
                  >
                    <Text style={styles.sendText}>{sentTo.has(item.id) ? '✓' : t('send')}</Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        )}
      </Glass>

      {/* Off-screen 9:16 card used for image export */}
      <View style={styles.offscreen} pointerEvents="none">
        <View ref={shotRef} collapsable={false}>
          <VerseCard verse={verse} width={360} height={640} translation={translation} lang={lang} dark={dark} badge="Selah" />
        </View>
      </View>
    </Modal>
  );
}

function Item({ icon, label, onPress, color, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; color: string; accent: string }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} haptic style={styles.item} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={accent} />
      <Text style={[styles.itemText, { color }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#0006' },
  sheet: { maxHeight: '70%', minHeight: 240, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52 },
  itemText: { fontFamily: UI_FONT.semibold, fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: UI_FONT.regular, marginBottom: 10 },
  friend: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  friendName: { flex: 1, fontFamily: UI_FONT.semibold, fontSize: 15 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  sendText: { color: '#fff', fontFamily: UI_FONT.bold },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
});
