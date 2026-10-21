import { ActivityIndicator, View } from 'react-native';

// Landing route for the OAuth redirect; the root gate moves on once the session is set.
export default function AuthCallback() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
