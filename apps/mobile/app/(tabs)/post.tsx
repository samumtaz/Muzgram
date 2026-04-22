import { useState } from 'react';

import { useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { feedKeys } from '../../src/queries/feed.queries';
import { useAuthStore } from '../../src/stores/auth.store';
import { useLocationStore } from '../../src/stores/location.store';
import { api } from '../../src/lib/api';

export default function PostScreen() {
  const [body, setBody] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const router = useRouter();
  const { token } = useAuthStore();
  const { location } = useLocationStore();
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: (data: {
      body: string;
      mediaUrls?: string[];
      cityId: string;
      lat?: number;
      lng?: number;
    }) => api.post('/posts', data, { token: token ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
      setBody('');
      setMediaUri(null);
      router.replace('/(tabs)');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    },
  });

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!body.trim()) return;

    // In production: upload media to R2 first via presigned URL, then pass publicUrl
    createPost.mutate({
      body: body.trim(),
      cityId: 'chicago', // TODO: detect from location
      lat: location?.lat,
      lng: location?.lng,
    });
  };

  const isReady = body.trim().length > 0 && !createPost.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-surface-border">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-text-secondary text-base">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-text-primary font-display text-base">New Post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isReady}
            className={`px-4 py-2 rounded-pill ${isReady ? 'bg-brand-gold' : 'bg-brand-gold-dim'}`}
          >
            {createPost.isPending ? (
              <ActivityIndicator color="#0D0D0D" size="small" />
            ) : (
              <Text className="text-text-inverse font-display text-sm">Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-4">
          {/* Post body */}
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="What's happening in your neighborhood?"
            placeholderTextColor="#606060"
            multiline
            maxLength={1000}
            autoFocus
            className="text-text-primary text-base leading-6 min-h-32"
            style={{ textAlignVertical: 'top' }}
          />

          {/* Character count */}
          <Text className={`text-xs text-right mt-2 ${body.length > 900 ? 'text-status-closed' : 'text-text-muted'}`}>
            {body.length}/1000
          </Text>

          {/* Media preview */}
          {mediaUri && (
            <View className="mt-4 relative">
              <Image
                source={{ uri: mediaUri }}
                className="w-full h-56 rounded-card"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setMediaUri(null)}
                className="absolute top-2 right-2 bg-background/80 rounded-full w-8 h-8 items-center justify-center"
              >
                <Text className="text-text-primary text-sm">✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Bottom toolbar */}
        <View className="flex-row px-4 py-3 border-t border-surface-border">
          <TouchableOpacity onPress={handlePickImage} className="mr-4">
            <Text className="text-text-secondary text-2xl">🖼️</Text>
          </TouchableOpacity>
          <Text className="text-text-muted text-sm self-center">
            📍 {location ? 'Location detected' : 'No location'}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
