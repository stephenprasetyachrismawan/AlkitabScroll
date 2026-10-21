import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileView } from '../../components/ProfileView';
import { useAuth } from '../../lib/auth';

export default function MyProfile() {
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  if (!userId) return null;
  return <ProfileView userId={userId} topInset={insets.top} />;
}
