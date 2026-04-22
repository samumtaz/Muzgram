import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuthStore } from '../../stores/auth.store';

export function AccountScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user) as any;

  const { mutate: deleteAccount } = useMutation({
    mutationFn: () => api.delete('/users/me', { token: token ?? undefined }),
    onSuccess: async () => {
      await signOut();
    },
  });

  const confirmDelete = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => deleteAccount(),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-4 pb-4 flex-row items-center border-b border-surface-border">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-text-secondary text-2xl">‹</Text>
        </Pressable>
        <Text className="text-text-primary font-display text-xl">Account</Text>
      </View>

      <ScrollView className="px-4 pt-4">
        <View className="bg-surface-elevated rounded-card p-4 mb-6 border border-surface-border">
          <Text className="text-text-muted text-xs uppercase tracking-wide mb-1">Phone</Text>
          <Text className="text-text-primary">{user?.phone ?? '—'}</Text>
        </View>

        <View className="bg-surface-elevated rounded-card p-4 mb-6 border border-surface-border">
          <Text className="text-text-muted text-xs uppercase tracking-wide mb-1">Display Name</Text>
          <Text className="text-text-primary">{user?.displayName ?? 'Not set'}</Text>
        </View>

        <View className="mt-8 pt-6 border-t border-surface-border">
          <Text className="text-text-muted text-xs mb-4">
            Deleting your account removes all your data including saves, posts, and business
            listings. This action cannot be undone.
          </Text>
          <Pressable
            onPress={confirmDelete}
            className="py-3 rounded-pill border border-status-closed items-center"
          >
            <Text className="text-status-closed font-medium">Delete My Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
