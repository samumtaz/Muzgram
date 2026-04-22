import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SkeletonBox({ className }: { className: string }) {
  return <View className={`bg-surface-DEFAULT rounded-card animate-pulse ${className}`} />;
}

function SkeletonCard() {
  return (
    <View className="mx-4 mb-4 bg-surface-DEFAULT rounded-card overflow-hidden border border-surface-border">
      <SkeletonBox className="w-full h-48" />
      <View className="p-4 gap-2">
        <SkeletonBox className="h-5 w-3/4" />
        <SkeletonBox className="h-4 w-1/2" />
      </View>
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 pt-2 pb-6">
        <SkeletonBox className="h-7 w-32 mb-4" />
        <View className="flex-row gap-2">
          {[1, 2, 3].map((i) => (
            <SkeletonBox key={i} className="h-8 w-16 rounded-pill" />
          ))}
        </View>
      </View>
      {[1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </SafeAreaView>
  );
}
