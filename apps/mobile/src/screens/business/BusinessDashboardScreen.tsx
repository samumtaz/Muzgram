import { useState } from 'react';

import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyListing, useMyLeads, useMyStats, useCheckoutSession, LeadStatusMobile } from '../../queries/business.queries';
import { LeadCard } from '../../components/business/LeadCard';
import { StatsBadge } from '../../components/business/StatsBadge';

const LEAD_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'New', value: LeadStatusMobile.NEW },
  { label: 'Responded', value: LeadStatusMobile.RESPONDED },
  { label: 'Closed', value: LeadStatusMobile.CLOSED },
] as const;

const TABS = ['Overview', 'Leads', 'Stats'] as const;
type Tab = typeof TABS[number];

export function BusinessDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [leadFilter, setLeadFilter] = useState<string>('all');

  const { data: listingData, isLoading: listingLoading } = useMyListing();
  const { data: leadsData, isLoading: leadsLoading } = useMyLeads(leadFilter);
  const { data: statsData } = useMyStats();
  const checkout = useCheckoutSession();

  const listing = listingData?.data;
  const leads = leadsData?.data ?? [];
  const stats = statsData?.data;
  const newLeadCount = leads.filter((l) => l.status === LeadStatusMobile.NEW).length;

  const handleBoost = async () => {
    if (!listing) return;
    try {
      const result = await checkout.mutateAsync({
        listingId: listing.id,
        product: 'featured_placement',
        interval: 'month',
      });
      await Linking.openURL(result.url);
    } catch {
      Alert.alert('Error', 'Could not open checkout. Please try again.');
    }
  };

  if (listingLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={['top']}>
        <ActivityIndicator color="#D4A853" />
      </SafeAreaView>
    );
  }

  if (!listing) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8" edges={['top']}>
        <Text className="text-text-secondary text-center text-base mb-4">
          You don't have a listing yet.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/business/claim' as any)}
          className="bg-brand-gold px-6 py-3 rounded-pill"
        >
          <Text className="text-text-inverse font-display">Claim Your Business</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-2 pb-3 border-b border-surface-border">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-text-primary text-xl font-display" numberOfLines={1}>
              {listing.name}
            </Text>
            {listing.trustScore >= 3 && (
              <Text className="text-status-open text-xs mt-0.5">✓ Verified Business</Text>
            )}
          </View>
          {/* Boost CTA */}
          {listing.isFeatured ? (
            <View className="bg-status-open/20 px-3 py-1.5 rounded-pill border border-status-open/40">
              <Text className="text-status-open text-xs font-display">
                ★ Featured
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleBoost}
              disabled={checkout.isPending}
              className="bg-brand-gold px-3 py-1.5 rounded-pill"
              activeOpacity={0.8}
            >
              <Text className="text-text-inverse text-xs font-display">
                {checkout.isPending ? '…' : 'Boost $275/mo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View className="flex-row gap-4 mt-3">
          {TABS.map((tab) => (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
              <View className="relative">
                <Text
                  className={`text-sm font-display ${
                    activeTab === tab ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {tab}
                  {tab === 'Leads' && newLeadCount > 0 ? ` (${newLeadCount})` : ''}
                </Text>
                {activeTab === tab && (
                  <View className="h-0.5 bg-brand-gold rounded-full mt-1" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab content */}
      {activeTab === 'Overview' && (
        <ScrollView className="flex-1 px-4 pt-4">
          {/* Featured status */}
          {listing.isFeatured && listing.featuredUntil && (
            <View className="bg-brand-gold/10 border border-brand-gold/30 rounded-xl px-4 py-3 mb-4">
              <Text className="text-brand-gold text-sm font-display">
                ★ Featured until {new Date(listing.featuredUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>
          )}

          {/* Quick actions */}
          <View className="gap-3 mb-6">
            <TouchableOpacity
              onPress={() => router.push('/business/edit' as any)}
              className="flex-row items-center bg-surface-DEFAULT rounded-xl px-4 py-4 border border-surface-border"
              activeOpacity={0.8}
            >
              <Text className="text-xl mr-4">✏️</Text>
              <Text className="text-text-primary text-base flex-1">Edit Listing</Text>
              <Text className="text-text-muted">›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-row items-center bg-surface-DEFAULT rounded-xl px-4 py-4 border border-surface-border"
              activeOpacity={0.8}
            >
              <Text className="text-xl mr-4">⭐</Text>
              <Text className="text-text-primary text-base flex-1">Add Today's Special</Text>
              <Text className="text-text-muted">›</Text>
            </TouchableOpacity>
          </View>

          {/* Listing preview */}
          <Text className="text-text-muted text-xs font-display uppercase tracking-wider mb-3">
            Live Preview
          </Text>
          <View className="bg-surface-DEFAULT rounded-xl p-4 border border-surface-border mb-8">
            <Text className="text-text-primary font-display text-base">{listing.name}</Text>
            <Text className="text-text-secondary text-sm mt-1">{listing.address}</Text>
            {listing.description && (
              <Text className="text-text-muted text-sm mt-2 leading-5" numberOfLines={3}>
                {listing.description}
              </Text>
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'Leads' && (
        <View className="flex-1">
          {/* Filter pills */}
          <View className="flex-row px-4 py-3 gap-2">
            {LEAD_FILTERS.map((f) => (
              <TouchableOpacity
                key={f.value}
                onPress={() => setLeadFilter(f.value)}
                className={`px-3 py-1.5 rounded-pill border ${
                  leadFilter === f.value
                    ? 'bg-brand-gold border-brand-gold'
                    : 'bg-transparent border-surface-border'
                }`}
              >
                <Text
                  className={`text-xs font-display ${
                    leadFilter === f.value ? 'text-text-inverse' : 'text-text-secondary'
                  }`}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {leadsLoading ? (
            <ActivityIndicator color="#D4A853" className="mt-8" />
          ) : leads.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8 gap-3">
              <Text className="text-text-secondary text-center text-base">No leads yet</Text>
              {!listing.isFeatured && (
                <TouchableOpacity onPress={handleBoost} className="bg-brand-gold px-5 py-2.5 rounded-pill">
                  <Text className="text-text-inverse font-display text-sm">Boost for more visibility</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlashList
              data={leads}
              renderItem={({ item }) => <LeadCard lead={item} />}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
            />
          )}
        </View>
      )}

      {activeTab === 'Stats' && (
        <ScrollView className="flex-1 px-4 pt-4">
          <Text className="text-text-muted text-xs font-display uppercase tracking-wider mb-3">
            Last 7 Days
          </Text>
          <View className="flex-row flex-wrap gap-3 mb-6">
            <StatsBadge
              label="Views"
              value={stats?.views ?? 0}
              changePercent={stats?.viewsChangePercent}
            />
            <StatsBadge label="Saves" value={stats?.saves ?? 0} />
          </View>
          <View className="flex-row flex-wrap gap-3">
            <StatsBadge label="Call Taps" value={stats?.callTaps ?? 0} />
            <StatsBadge label="Leads" value={stats?.leadsCount ?? 0} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
