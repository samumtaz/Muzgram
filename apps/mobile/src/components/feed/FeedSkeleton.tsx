import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  delay = 0,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  delay?: number;
}) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#2A2A2A' }, animStyle]}
    />
  );
}

function SkeletonCard() {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#2A2A2A',
      }}
    >
      {/* Image — matches real card h-48 = 192px */}
      <SkeletonBox width="100%" height={192} borderRadius={0} />
      <View style={{ padding: 16, gap: 10 }}>
        {/* Title + save icon row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonBox width="65%" height={18} />
          <SkeletonBox width={24} height={24} borderRadius={12} />
        </View>
        {/* Meta pills row */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <SkeletonBox width={60} height={22} borderRadius={6} />
          <SkeletonBox width={48} height={22} borderRadius={6} />
          <SkeletonBox width={40} height={22} borderRadius={6} />
        </View>
      </View>
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0D0D0D' }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <SkeletonBox width={120} height={28} borderRadius={6} />
      </View>
      {/* Category pills */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
        {[64, 52, 72, 60].map((w, i) => (
          <SkeletonBox key={i} width={w} height={34} borderRadius={999} />
        ))}
      </View>
      {/* Cards */}
      {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
    </SafeAreaView>
  );
}
