import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/stores/auth.store';
import { formatDistanceToNow } from '../../src/lib/time';

interface MyPost {
  id: string;
  body: string;
  media_urls: string[];
  status: string;
  created_at: string;
  linked_listing_id: string | null;
}

export default function MyPostsScreen() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data: posts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['my-posts'],
    queryFn: () => api.get<MyPost[]>('/posts/user/me', { token: token ?? undefined }),
    enabled: !!token,
  });

  const deletePost = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/posts/${id}`, { token: token ?? undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-posts'] }),
  });

  const handleDelete = (id: string) => {
    Alert.alert('Delete Post', 'Remove this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePost.mutate(id),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4 border-b border-surface-border">
        <Pressable onPress={() => router.back()} className="mr-3 p-1">
          <Text className="text-text-secondary text-2xl">‹</Text>
        </Pressable>
        <Text className="text-text-primary font-display text-xl">My Posts</Text>
        <View className="flex-1" />
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/post' as any)}
          className="bg-brand-gold/20 px-3 py-1.5 rounded-pill"
        >
          <Text className="text-brand-gold text-sm font-display">+ New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#D4A853" className="mt-12" />
      ) : !posts?.length ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">✏️</Text>
          <Text className="text-text-primary text-lg font-display text-center mb-2">
            No posts yet
          </Text>
          <Text className="text-text-muted text-sm text-center mb-6">
            Share what's happening in your neighborhood — events, finds, recommendations.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/post' as any)}
            className="bg-brand-gold px-6 py-3 rounded-2xl"
          >
            <Text className="text-background font-display">Create your first post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#D4A853" />
          }
          renderItem={({ item }) => (
            <View className="bg-surface-DEFAULT rounded-card border border-surface-border p-4">
              {/* Status badge */}
              {item.status !== 'active' && (
                <View className="mb-2">
                  <Text className="text-xs text-text-muted uppercase tracking-wider">
                    {item.status === 'pending' ? '⏳ Pending review' : item.status}
                  </Text>
                </View>
              )}

              <Text className="text-text-primary text-base leading-relaxed mb-3" numberOfLines={4}>
                {item.body}
              </Text>

              {item.media_urls.length > 0 && (
                <Text className="text-text-muted text-xs mb-3">
                  📷 {item.media_urls.length} photo{item.media_urls.length > 1 ? 's' : ''}
                </Text>
              )}

              <View className="flex-row items-center justify-between">
                <Text className="text-text-muted text-xs">
                  {formatDistanceToNow(item.created_at)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  className="px-3 py-1 rounded-pill border border-status-closed/40"
                >
                  <Text className="text-status-closed text-xs">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
