import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import type { RootStackParamList } from '../../App';
import {
  AVAILABLE_ANIMATIONS,
  AVAILABLE_CATEGORIES,
  getAnimationById,
  getAnimationOfTheDay,
  getCategory,
  searchAnimations,
  type Animation,
  type CategoryId,
} from '../data/animations';
import {
  getFavoriteAnimationIds,
  toggleFavoriteAnimation,
} from '../utils/animationFavorites';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type FilterId = CategoryId | 'all';

const TEAL = '#41a39d';

const ExploreLearnScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  // Two-column grid: 16px outer padding each side + 12px gutter.
  const tileWidth = (width - 16 * 2 - 12) / 2;

  useFocusEffect(
    useCallback(() => {
      getFavoriteAnimationIds().then(setFavoriteIds);
    }, [])
  );

  const animationOfTheDay = useMemo(() => getAnimationOfTheDay(), []);

  const visibleAnimations = useMemo(() => {
    const byCategory =
      activeFilter === 'all'
        ? AVAILABLE_ANIMATIONS
        : AVAILABLE_ANIMATIONS.filter(a => a.categoryId === activeFilter);
    return searchAnimations(byCategory, query);
  }, [activeFilter, query]);

  const favoriteAnimations = useMemo(
    () =>
      favoriteIds
        .map(getAnimationById)
        .filter((a): a is Animation => a !== undefined && a.vimeoUrl !== null),
    [favoriteIds]
  );

  const openAnimation = useCallback(async (animation: Animation) => {
    if (!animation.vimeoUrl) return;
    try {
      await WebBrowser.openBrowserAsync(animation.vimeoUrl);
    } catch (err) {
      console.warn('[ExploreLearn] Failed to open animation:', err);
    }
  }, []);

  const onToggleFavorite = useCallback(async (id: string) => {
    setFavoriteIds(await toggleFavoriteAnimation(id));
  }, []);

  const renderTile = (animation: Animation, keyPrefix: string) => {
    const category = getCategory(animation.categoryId);
    const isFavorite = favoriteIds.includes(animation.id);

    return (
      <TouchableOpacity
        key={`${keyPrefix}-${animation.id}`}
        style={[styles.tile, { width: tileWidth }]}
        onPress={() => openAnimation(animation)}
        activeOpacity={0.85}
      >
        <View style={[styles.tileThumb, { backgroundColor: category.color }]}>
          <Ionicons name={category.icon} size={30} color="#FFF" />
          <View style={styles.playBadge}>
            <Ionicons name="play" size={12} color="#FFF" />
          </View>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => onToggleFavorite(animation.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorite ? '#FF3B30' : '#FFF'}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.tileBody}>
          <Text style={styles.tileCategory}>{category.label}</Text>
          <Text style={styles.tileTitle} numberOfLines={3}>
            {animation.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const heroCategory = getCategory(animationOfTheDay.categoryId);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>Explore & Learn</Text>
        <Text style={styles.subheader}>
          Short animations to support your heart health.
        </Text>

        {/* Animation of the day */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => openAnimation(animationOfTheDay)}
          activeOpacity={0.9}
        >
          <View style={[styles.heroThumb, { backgroundColor: heroCategory.color }]}>
            <Ionicons name={heroCategory.icon} size={40} color="#FFF" />
            <View style={styles.heroPlayBadge}>
              <Ionicons name="play" size={16} color="#FFF" />
            </View>
          </View>
          <View style={styles.heroBody}>
            <Text style={styles.heroEyebrow}>ANIMATION OF THE DAY</Text>
            <Text style={styles.heroTitle} numberOfLines={3}>
              {animationOfTheDay.title}
            </Text>
            <Text style={styles.heroCategory}>{heroCategory.label}</Text>
          </View>
        </TouchableOpacity>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search animations"
            placeholderTextColor="#8E8E93"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {([{ id: 'all' as FilterId, label: 'All' }, ...AVAILABLE_CATEGORIES]).map(chip => {
            const isActive = activeFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveFilter(chip.id as FilterId)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Favorites */}
        {favoriteAnimations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Favorites</Text>
            <View style={styles.grid}>
              {favoriteAnimations.map(a => renderTile(a, 'fav'))}
            </View>
          </View>
        )}

        {/* Library */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {activeFilter === 'all' ? 'All Animations' : getCategory(activeFilter).label}
          </Text>
          {visibleAnimations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={28} color="#8E8E93" />
              <Text style={styles.emptyText}>No animations match your search.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {visibleAnimations.map(a => renderTile(a, 'all'))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backText: {
    fontSize: 17,
    color: TEAL,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#000',
    marginHorizontal: 16,
    marginTop: 8,
  },
  subheader: {
    fontSize: 15,
    color: '#6B7280',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
  },

  heroCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  heroThumb: {
    width: 84,
    height: 84,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlayBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flex: 1,
    marginLeft: 14,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: TEAL,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  heroCategory: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#000',
  },

  chipScroll: {
    marginTop: 14,
  },
  chipRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFF',
  },
  chipActive: {
    backgroundColor: TEAL,
  },
  chipText: {
    fontSize: 14,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },

  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  tile: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  tileThumb: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBody: {
    padding: 10,
  },
  tileCategory: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 2,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 15,
    color: '#8E8E93',
  },
});

export default ExploreLearnScreen;
