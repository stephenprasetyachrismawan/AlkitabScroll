import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, router } from 'expo-router';
import * as api from '../lib/api';
import { useAuth } from '../lib/auth';
import { UI_FONT } from '../lib/fonts';
import { useSettings } from '../lib/settings';

export default function EditProfile() {
  const { t, colors } = useSettings();
  const { userId, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');

  const save = async () => {
    if (!userId) return;
    const clean = username.toLowerCase().replace(/[^a-z0-9_.]/g, '');
    if (!name.trim() || clean.length < 3) return Alert.alert('Selah', t('errorGeneric'));
    try {
      await api.updateProfile(userId, { display_name: name.trim(), username: clean, bio: bio.trim() });
      await refreshProfile();
      router.back();
    } catch (e) {
      Alert.alert('Selah', e instanceof Error ? e.message : t('errorGeneric'));
    }
  };

  const field = (label: string, value: string, set: (v: string) => void, multiline = false) => (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={set}
        multiline={multiline}
        maxLength={multiline ? 160 : 40}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }, multiline && { minHeight: 80 }]}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 16 }}>
      <Stack.Screen
        options={{
          title: t('editProfile'),
          headerRight: () => (
            <Pressable onPress={save}>
              <Text style={{ color: colors.primary, fontFamily: UI_FONT.bold, fontSize: 16 }}>{t('save')}</Text>
            </Pressable>
          ),
        }}
      />
      {field(t('displayName'), name, setName)}
      {field(t('username'), username, setUsername)}
      {field(t('bio'), bio, setBio, true)}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: UI_FONT.semibold, fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontFamily: UI_FONT.regular, fontSize: 15 },
});
