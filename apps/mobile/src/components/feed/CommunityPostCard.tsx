import { memo } from 'react';

import { Image } from 'expo-image';
import { Text, TouchableOpacity, View } from 'react-native';

import { ContentType, CommunityPost } from '@muzgram/types';

interface CommunityPostCardProps {
  post: CommunityPost;
  onSave?: (contentType: ContentType, contentId: string) => void;
}

export const CommunityPostCard = memo(function CommunityPostCard({
  post,
  onSave,
}: CommunityPostCardProps) {
  const timeAgo = formatTimeAgo(post.createdAt);

  return (
    <View className="mx-4 mb-4 bg-surface-DEFAULT rounded-card border border-surface-border p-4">
      {/* Author row */}
      <View className="flex-row items-center mb-3">
        {post.author.avatarUrl ? (
          <Image
            source={{ uri: post.author.avatarUrl }}
            className="w-9 h-9 rounded-full mr-3"
            contentFit="cover"
          />
        ) : (
          <View className="w-9 h-9 rounded-full bg-background-elevated mr-3 items-center justify-center">
            <Text className="text-text-secondary text-sm">
              {(post.author.displayName ?? 'U')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-text-primary text-sm font-display">
            {post.author.displayName ?? 'Community member'}
          </Text>
          <Text className="text-text-muted text-xs">
            {post.neighborhood ? `${post.neighborhood} · ` : ''}{timeAgo}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onSave?.(ContentType.POST, post.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className={`text-xl ${post.isSaved ? 'text-brand-gold' : 'text-text-muted'}`}>
            {post.isSaved ? '♥' : '♡'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <Text className="text-text-primary text-base leading-6 mb-3" numberOfLines={4}>
        {post.body}
      </Text>

      {/* Media */}
      {post.mediaUrls.length > 0 && (
        <Image
          source={{ uri: post.mediaUrls[0] }}
          className="w-full h-48 rounded-card mb-3"
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Linked listing */}
      {post.linkedListing && (
        <View className="flex-row items-center bg-background-elevated rounded-badge px-3 py-2">
          <Text className="text-brand-gold text-xs mr-1">📍</Text>
          <Text className="text-text-secondary text-xs">{post.linkedListing.name}</Text>
        </View>
      )}

      {/* Footer */}
      <View className="flex-row items-center mt-3 pt-3 border-t border-surface-border">
        <Text className="text-text-muted text-xs">{post.savesCount} saves</Text>
      </View>
    </View>
  );
});

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
