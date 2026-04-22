export function formatDistanceToNow(isoDate: string): string {
  const now = Date.now();
  const diff = now - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatEventTime(startAt: string): string {
  const d = new Date(startAt);
  const now = new Date();
  const diffH = (d.getTime() - now.getTime()) / 3_600_000;

  if (diffH < 0) return 'Started';
  if (diffH < 1) return `In ${Math.round(diffH * 60)}min`;
  if (diffH < 24) return `In ${Math.floor(diffH)}h`;
  if (diffH < 48) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
