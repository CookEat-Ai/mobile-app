import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace('/(tabs)');
    }, 3000);
    return () => clearTimeout(timeout);
  }, [router]);

  return <View style={{ flex: 1, backgroundColor: '#FDF9E2' }} />;
}
