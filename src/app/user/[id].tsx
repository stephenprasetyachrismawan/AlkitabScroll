import { useLocalSearchParams } from 'expo-router';
import { ProfileView } from '../../components/ProfileView';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProfileView userId={id} />;
}
