import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSearch, useSearchSuggestions, SearchResultItem } from '../queries/search.queries';

const CATEGORY_TABS = [
  { label: 'All', value: 'all' },
  { label: 'Places', value: 'eat' },
  { label: 'Events', value: 'events' },
  { label: 'Services', value: 'connect' },
] as const;

const BROWSE_CATS = [
  { label: 'Eat', emoji: '🍽', value: 'eat' },
  { label: 'Go Out', emoji: '✦', value: 'go_out' },
  { label: 'Connect', emoji: '◎', value: 'connect' },
];

const EXAMPLE_QUERIES = ['Shawarma', 'Eid events', 'photographers', 'halal grocery'];

// Persist recent searches in module scope (survives hot reload, clears on app kill)
// For persistence across sessions, upgrade to MMKV or AsyncStorage
let _recentSearches: string[] = [];

function addRecentSearch(q: string) {
  _recentSearches = [q, ..._recentSearches.filter((s) => s !== q)].slice(0, 10);
}

export function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(_recentSearches);

  const { data: suggestions } = useSearchSuggestions(query);
  const { data: results, isLoading: isSearching } = useSearch(submittedQuery, activeTab);

  // Autofocus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) return;
      addRecentSearch(trimmed);
      setRecentSearches([..._recentSearches]);
      setSubmittedQuery(trimmed);
      setShowSuggestions(false);
      Keyboard.dismiss();
    },
    [],
  );

  const handleResultPress = useCallback(
    (item: SearchResultItem) => {
      const slug = item.item.slug;
      if (item.contentType === 'listing') router.push(`/listing/${slug}` as any);
      else if (item.contentType === 'event') router.push(`/event/${slug}` as any);
    },
    [router],
  );

  const hasResults = !!submittedQuery && results;
  const showEmpty = !!submittedQuery && !isSearching && results && results.results.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Search bar */}
      <View className="flex-row items-center px-4 pt-2 pb-3 gap-3">
        <View className="flex-1 flex-row items-center bg-surface-elevated rounded-xl px-3 h-11 border border-surface-border">
          <Text className="text-text-muted mr-2">⌕</Text>
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setShowSuggestions(t.length >= 2);
            }}
            onSubmitEditing={() => handleSubmit(query)}
            placeholder="Search places, events, services…"
            placeholderTextColor="#606060"
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-text-primary text-sm"
            style={{ fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' }}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setQuery('');
                setSubmittedQuery('');
                setShowSuggestions(false);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-text-muted text-base">✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Cancel */}
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-brand-gold text-sm font-display">Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions?.suggestions && suggestions.suggestions.length > 0 && (
        <View className="mx-4 bg-surface-elevated rounded-xl border border-surface-border overflow-hidden mb-2">
          {suggestions.suggestions.map((s) => (
            <TouchableOpacity
              key={s.id}
              onPress={() => {
                setQuery(s.name);
                handleSubmit(s.name);
              }}
              className="flex-row items-center px-4 py-3 border-b border-surface-border last:border-0"
            >
              <Text className="text-text-muted mr-3 text-sm">⌕</Text>
              <Text className="text-text-primary text-sm flex-1">{s.name}</Text>
              <Text className="text-text-muted text-xs capitalize">{s.type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results view */}
      {hasResults && !showSuggestions ? (
        <View className="flex-1">
          {/* Tab filter */}
          <View className="flex-row px-4 gap-2 mb-2">
            {CATEGORY_TABS.map((tab) => (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setActiveTab(tab.value)}
                className={`px-3 py-1.5 rounded-pill border ${
                  activeTab === tab.value
                    ? 'bg-brand-gold border-brand-gold'
                    : 'bg-transparent border-surface-border'
                }`}
              >
                <Text
                  className={`text-xs font-display ${
                    activeTab === tab.value ? 'text-text-inverse' : 'text-text-secondary'
                  }`}
                >
                  {tab.label}
                  {tab.value !== 'all' &&
                    results?.tabs[tab.value as keyof typeof results.tabs] != null &&
                    ` (${results.tabs[tab.value as keyof typeof results.tabs]})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isSearching ? (
            <ActivityIndicator color="#D4A853" className="mt-8" />
          ) : showEmpty ? (
            <View className="flex-1 items-center justify-center px-8 gap-4">
              <Text className="text-text-secondary text-center text-base">
                No results for "{submittedQuery}"
              </Text>
              <Text className="text-text-muted text-sm text-center">
                Try something like:{' '}
                {EXAMPLE_QUERIES.join(', ')}
              </Text>
            </View>
          ) : (
            <FlashList
              data={results?.results ?? []}
              renderItem={({ item }) => (
                <SearchResultCard item={item} onPress={handleResultPress} />
              )}
              keyExtractor={(item) => `${item.contentType}-${item.item.id}`}
              ListHeaderComponent={
                results?.resultLabel ? (
                  <Text className="text-text-muted text-xs px-4 py-2">
                    {results.resultLabel}
                  </Text>
                ) : null
              }
            />
          )}
        </View>
      ) : !submittedQuery ? (
        /* Default state — recent searches + browse categories */
        <Pressable className="flex-1" onPress={Keyboard.dismiss}>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <View className="px-4 mb-6">
              <Text className="text-text-muted text-xs font-display uppercase tracking-wider mb-3">
                Recent
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {recentSearches.slice(0, 8).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      setQuery(s);
                      handleSubmit(s);
                    }}
                    className="px-3 py-1.5 rounded-pill bg-surface-elevated border border-surface-border"
                  >
                    <Text className="text-text-secondary text-sm">{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Browse categories */}
          <View className="px-4">
            <Text className="text-text-muted text-xs font-display uppercase tracking-wider mb-3">
              Browse
            </Text>
            <View className="gap-3">
              {BROWSE_CATS.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => {
                    setQuery(cat.label);
                    handleSubmit(cat.label);
                  }}
                  className="flex-row items-center bg-surface-elevated rounded-xl px-4 py-4 border border-surface-border"
                  activeOpacity={0.8}
                >
                  <Text className="text-2xl mr-4">{cat.emoji}</Text>
                  <Text className="text-text-primary text-base font-display">{cat.label}</Text>
                  <Text className="text-text-muted ml-auto">›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

// Internal import — must come after function definition to avoid circular
import { SearchResultCard } from '../components/feed/SearchResultCard';
