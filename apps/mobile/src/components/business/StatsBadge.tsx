import { Text, View } from 'react-native';

interface StatsBadgeProps {
  label: string;
  value: number;
  changePercent?: number;
}

export function StatsBadge({ label, value, changePercent }: StatsBadgeProps) {
  const positive = (changePercent ?? 0) >= 0;

  return (
    <View className="flex-1 bg-surface-elevated rounded-xl p-4 border border-surface-border">
      <Text className="text-text-muted text-xs mb-1">{label}</Text>
      <Text className="text-text-primary text-2xl font-display">{value}</Text>
      {changePercent != null && (
        <Text className={`text-xs mt-1 ${positive ? 'text-status-open' : 'text-status-closed'}`}>
          {positive ? '↑' : '↓'} {Math.abs(changePercent)}% vs last week
        </Text>
      )}
    </View>
  );
}
