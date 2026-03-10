import { router, useFocusEffect } from "expo-router";
import React, { useState, useCallback, useRef } from 'react';
import I18n from '../../i18n';
import { FlatList, StyleSheet, Text, View, RefreshControl, TouchableOpacity, Alert, Animated, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { RecipeCard } from "../../components/RecipeCard";
import { IconSymbol } from "../../components/ui/IconSymbol";
import apiService from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import revenueCatService from '../../config/revenuecat';
import recipeStorage from "../../services/recipeStorage";

interface ImportedRecipe {
  id: string;
  title: string;
  image?: string;
  cooking_time: string;
  ingredientsCount: number;
  stepsCount?: number;
  isImported?: boolean;
  videoUrl?: string;
  createdAt: string;
}

const BATCH_SIZE = 30;

export default function ImportedScreen() {
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<ImportedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(__DEV__ ? false : true);

  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const isLoadingMoreRef = useRef(isLoadingMore);
  isLoadingMoreRef.current = isLoadingMore;
  const pageRef = useRef(page);
  pageRef.current = page;
  const hasLoadedOnceRef = useRef(hasLoadedOnce);
  hasLoadedOnceRef.current = hasLoadedOnce;

  const animatedValues = useRef<Map<string, Animated.Value>>(new Map());

  const getAnimatedValue = (id: string) => {
    if (!animatedValues.current.has(id)) {
      animatedValues.current.set(id, new Animated.Value(1));
    }
    return animatedValues.current.get(id)!;
  };

  const resolveUserId = async (): Promise<string | null> => {
    return await AsyncStorage.getItem('userId');
  };

  const loadRecipes = useCallback(async (pageNum: number = 1, reset: boolean = false, showLoader: boolean = false) => {
    if (!reset && isLoadingMoreRef.current) return;
    if (!reset && pageNum > 1 && !hasMoreRef.current) return;

    try {
      if (showLoader) setLoading(true);
      setIsLoadingMore(true);

      const [userId, status] = await Promise.all([
        resolveUserId(),
        revenueCatService.getSubscriptionStatus(),
      ]);
      setIsSubscribed(status.isSubscribed);

      if (!userId) {
        if (reset) {
          setRecipes([]);
          setPage(1);
          setHasMore(false);
        }
        return;
      }

      const response = await apiService.getRecipeHistory(userId, pageNum, BATCH_SIZE, { isImported: true });
      if (response.data?.history) {
        const imageById = new Map<string, string>();
        try {
          const storedRecipes = await recipeStorage.getStoredRecipes();
          storedRecipes.forEach((stored: any) => {
            if (stored?.id && stored?.recipe?.image && !imageById.has(stored.id)) {
              imageById.set(stored.id, stored.recipe.image);
            }
          });
        } catch {
          // ignore
        }

        const cachedImages = await recipeStorage.getCachedImages();

        const newItems = (response.data.history as ImportedRecipe[]).map((item) => ({
          ...item,
          image: cachedImages[item.id] || item.image || imageById.get(item.id),
        }));

        setRecipes((prev) => {
          if (reset) return newItems;
          const existing = new Map<string, ImportedRecipe>();
          prev.forEach((item) => existing.set(item.id, item));
          newItems.forEach((item) => existing.set(item.id, item));
          return Array.from(existing.values());
        });

        if (reset || pageNum > 1) setPage(pageNum);

        if (typeof response.data.pagination?.hasMore === 'boolean') {
          setHasMore(response.data.pagination.hasMore);
        } else {
          setHasMore(newItems.length >= BATCH_SIZE);
        }
      } else if (reset) {
        setRecipes([]);
        setPage(1);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading imported recipes:', error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      if (!hasLoadedOnceRef.current) setHasLoadedOnce(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecipes(1, true, !hasLoadedOnceRef.current);
    }, [loadRecipes])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecipes(1, true, false);
    setRefreshing(false);
  }, [loadRecipes]);

  const loadMore = useCallback(() => {
    if (!isLoadingMoreRef.current && hasMoreRef.current) {
      loadRecipes(pageRef.current + 1, false);
    }
  }, [loadRecipes]);

  const handleRecipePress = (recipe: ImportedRecipe) => {
    router.push({
      pathname: '/recipe-detail',
      params: {
        recipeId: recipe.id,
        showGenerateButton: 'false',
        isHistory: 'true'
      }
    });
  };

  const handleDeleteRecipe = async (recipe: ImportedRecipe) => {
    Alert.alert(
      I18n.t('home.deleteRecipe.title'),
      I18n.t('home.deleteRecipe.message', { title: recipe.title }),
      [
        {
          text: I18n.t('common.cancel'),
          style: 'cancel',
        },
        {
          text: I18n.t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const userId = await resolveUserId();
              if (!userId) return;

              const response = await apiService.deleteRecipe(recipe.id, userId);
              if (response.data?.success) {
                const anim = getAnimatedValue(recipe.id);
                Animated.timing(anim, {
                  toValue: 0,
                  duration: 300,
                  useNativeDriver: false,
                }).start(() => {
                  setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
                  animatedValues.current.delete(recipe.id);
                });
              } else {
                Alert.alert(I18n.t('common.error'), I18n.t('recipeDetail.error'));
              }
            } catch (error) {
              console.error('Error deleting recipe:', error);
              Alert.alert(I18n.t('common.error'), I18n.t('recipeDetail.error'));
            }
          },
        },
      ]
    );
  };

  const renderPremiumCard = () => (
    <TouchableOpacity
      style={styles.premiumCard}
      onPress={() => router.push({ pathname: '/paywall', params: { source: 'imported_banner' } })}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#FFD700', '#FDB931']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.premiumGradient}
      >
        <View style={styles.premiumContent}>
          <View style={{ flex: 1 }}>
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PREMIUM</Text>
            </View>
            <Text style={styles.premiumTitle}>{I18n.t('imported.premiumTitle')}</Text>
            <Text style={styles.premiumDescription}>
              {I18n.t('imported.premiumDescription')}
            </Text>
          </View>
          <View style={styles.premiumIconContainer}>
            <IconSymbol name="square.and.arrow.down.fill" size={36} color="white" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <IconSymbol name="square.and.arrow.down" size={48} color={colors.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>{I18n.t('imported.noImported')}</Text>
      <Text style={styles.emptyDescription}>{I18n.t('imported.noImportedDescription')}</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['#F6EEE9', '#FFFFFF']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      locations={[0, 0.3]}
      style={[styles.container, { paddingTop: insets.top + 40 }]}
    >
      <View style={styles.titleContainer}>
        <Text style={styles.mainTitle} numberOfLines={1} adjustsFontSizeToFit>{I18n.t('imported.title')}</Text>
        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => router.push({
            pathname: '/onboarding/videoImportTutorial',
            params: { isFromImport: 'true' }
          })}
          activeOpacity={0.7}
        >
          <IconSymbol name="help" size={24} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.button} />
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={!isSubscribed || __DEV__ ? renderPremiumCard : null}
          renderItem={({ item }) => {
            const anim = getAnimatedValue(item.id);
            return (
              <Animated.View
                style={{
                  opacity: anim,
                  transform: [{
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  }],
                  maxHeight: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 500], // Une valeur assez grande pour ne pas couper la carte
                  }),
                  overflow: 'hidden',
                }}
              >
                <RecipeCard
                  item={item as any}
                  onPress={() => handleRecipePress(item)}
                  onLongPress={() => handleDeleteRecipe(item)}
                />
              </Animated.View>
            );
          }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.button}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            isLoadingMore && recipes.length > 0 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.button} />
              </View>
            ) : null
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  mainTitle: {
    fontSize: 32,
    color: Colors.light.text,
    flex: 1,
    fontFamily: 'Degular'
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  premiumCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FDB931',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginBottom: 20,
  },
  premiumGradient: {
    padding: 24,
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  proBadgeText: {
    color: 'white',
    fontSize: 12,
    letterSpacing: 1,
    fontFamily: 'Degular'
  },
  premiumTitle: {
    fontSize: 22,
    color: 'white',
    marginBottom: 4,
    width: '90%',
    fontFamily: 'Degular'
  },
  premiumDescription: {
    fontFamily: 'CronosPro',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  premiumIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Degular'
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
