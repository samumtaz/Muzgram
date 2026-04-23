import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UserRole } from '@muzgram/types';

import { useAuthStore } from '../../src/stores/auth.store';
import { useNotificationsStore } from '../../src/stores/notifications.store';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useAuthStore();
  const router = useRouter();
  const unreadCount = useNotificationsStore((s) => s.unreadCount);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView>
        {/* Header */}
        <View className="px-4 pt-4 pb-6 border-b border-surface-border">
          <View className="w-16 h-16 rounded-full bg-surface-DEFAULT items-center justify-center mb-3">
            <Text className="text-text-primary text-2xl">
              {(user?.displayName ?? user?.phone ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
          <Text className="text-text-primary font-display text-xl">
            {user?.displayName ?? 'Muzgram User'}
          </Text>
          <Text className="text-text-muted text-sm">{user?.phone}</Text>
        </View>

        {/* Menu items */}
        <View className="px-4 pt-4 gap-1">
          {/* Notifications row with badge */}
          <TouchableOpacity
            onPress={() => router.push('/notifications' as any)}
            className="flex-row items-center py-4 border-b border-surface-border"
            activeOpacity={0.7}
          >
            <Text className="text-xl mr-4">🔔</Text>
            <Text className="text-text-primary text-base flex-1">Notifications</Text>
            {unreadCount > 0 && (
              <View className="bg-brand-gold rounded-full min-w-[20px] h-5 items-center justify-center px-1 mr-2">
                <Text className="text-text-inverse text-xs font-display">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
            <Text className="text-text-muted">›</Text>
          </TouchableOpacity>

          {/* Business owner section */}
          {(user as any)?.role === UserRole.BUSINESS_OWNER ? (
            <TouchableOpacity
              onPress={() => router.push('/business/dashboard' as any)}
              className="flex-row items-center py-4 border-b border-surface-border"
              activeOpacity={0.7}
            >
              <Text className="text-xl mr-4">🏪</Text>
              <Text className="text-text-primary text-base flex-1">My Business</Text>
              <Text className="text-text-muted">›</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/business/claim' as any)}
              className="flex-row items-center py-4 border-b border-surface-border"
              activeOpacity={0.7}
            >
              <Text className="text-xl mr-4">➕</Text>
              <Text className="text-text-primary text-base flex-1">List Your Business</Text>
              <Text className="text-text-muted">›</Text>
            </TouchableOpacity>
          )}

          {[
            { label: 'My Saves', emoji: '♥', route: '/saves' },
            { label: 'My Posts', emoji: '✏️', route: '/my-posts' },
            { label: 'Settings', emoji: '⚙', route: '/settings' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as any)}
              className="flex-row items-center py-4 border-b border-surface-border"
              activeOpacity={0.7}
            >
              <Text className="text-xl mr-4">{item.emoji}</Text>
              <Text className="text-text-primary text-base flex-1">{item.label}</Text>
              <Text className="text-text-muted">›</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center py-4 mt-4"
            activeOpacity={0.7}
          >
            <Text className="text-status-closed text-base">Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* App version footer */}
        <Text className="text-text-muted text-xs text-center py-8">
          Muzgram · v1.0.0 · Chicago
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
