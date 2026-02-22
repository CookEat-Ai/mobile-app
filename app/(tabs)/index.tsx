import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useState, useCallback } from 'react';
import I18n from '../../i18n';
import { ScrollView, StyleSheet, Text, View, Dimensions, TouchableOpacity, Platform, Image, Button, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { IconSymbol } from "../../components/ui/IconSymbol";
import revenueCatService from '../../config/revenuecat';
import { useNotifications } from '../../hooks/useNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/api';
import { getUniqueDeviceId } from '../../services/deviceStorage';
import { RecipeCard } from "../../components/RecipeCard";
import recipeStorage from "../../services/recipeStorage";
import * as Sentry from '@sentry/react-native';
import { hasShownWheelInSession, markWheelShownInSession } from '../../services/sessionFlags';

const { width } = Dimensions.get('window');
const STORAGE_KEY = 'pantry_ingredients';
const HISTORY_BATCH_SIZE = 30;

interface HistoryItem {
  id: string;
  title: string;
  image?: string;
  cooking_time: string;
  ingredientsCount: number;
  stepsCount?: number;
  createdAt: string;
}

export default function HomeScreen() {
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [pantryCount, setPantryCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(true); // Par défaut true pour éviter le flash de l'upsell
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingMoreHistory, setIsLoadingMoreHistory] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [weekActivity, setWeekActivity] = useState<boolean[]>(Array(7).fill(false));

  const { updateActivity } = useNotifications();

  const maybeShowLaunchWheel = useCallback(async () => {
    if (hasShownWheelInSession()) return;

    try {
      const isOnboarding = await AsyncStorage.getItem('isOnboarding');
      const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');

      if (isOnboarding === 'true' || onboardingCompleted !== 'true') return;

      const status = await revenueCatService.getSubscriptionStatus();
      if (status.isSubscribed) return;

      markWheelShownInSession();
      setTimeout(() => {
        router.push({
          pathname: '/paywall',
          params: {
            source: 'app_open_last_chance',
            initialState: 'WHEEL',
          },
        });
      }, 600);
    } catch (error) {
      console.error('Erreur affichage spinning wheel au lancement:', error);
    }
  }, []);

  useEffect(() => {
    updateActivity();
    checkSubscription();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPantryCount();
      checkSubscription();
      loadHistory(1, true);
      maybeShowLaunchWheel();
    }, [])
  );

  useEffect(() => {
    calculateStreak();
  }, [history]);

  const resolveUserId = async (): Promise<string | null> => {
    const storedUserId = await AsyncStorage.getItem('userId');
    if (storedUserId) return storedUserId;

    try {
      const mobileId = await getUniqueDeviceId();
      const response = await apiService.getCurrentUser(mobileId);
      const serverUserId = response.data?._id ? String(response.data._id) : null;
      if (serverUserId) {
        await AsyncStorage.setItem('userId', serverUserId);
        return serverUserId;
      }
    } catch (error) {
      console.error('[History] impossible de résoudre le userId:', error);
    }

    return null;
  };

  const calculateStreak = () => {
    if (history.length === 0) {
      setStreakCount(0);
      setWeekActivity(Array(7).fill(false));
      return;
    }

    // Calculer l'activité de la semaine (7 derniers jours)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const last7Days = Array(7).fill(0).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const activity = last7Days.map(date => {
      return history.some(item => {
        const itemDate = new Date(item.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === date.getTime();
      });
    });

    setWeekActivity(activity);

    // Calculer le streak actuel
    let streak = 0;
    let checkDate = new Date(today);
    
    while (true) {
      const hasActivity = history.some(item => {
        const itemDate = new Date(item.createdAt);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.getTime() === checkDate.getTime();
      });

      if (hasActivity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Si pas d'activité aujourd'hui, on vérifie si on a eu une activité hier
        if (streak === 0) {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const hasYesterdayActivity = history.some(item => {
            const itemDate = new Date(item.createdAt);
            itemDate.setHours(0, 0, 0, 0);
            return itemDate.getTime() === yesterday.getTime();
          });
          
          if (hasYesterdayActivity) {
            checkDate = yesterday;
            continue;
          }
        }
        break;
      }
    }
    setStreakCount(streak);
  };

  const loadHistory = async (page: number = 1, reset: boolean = false) => {
    if (!reset && (!hasMoreHistory || isLoadingMoreHistory)) return;

    try {
      setIsLoadingMoreHistory(true);
      const userId = await resolveUserId();
      if (!userId) {
        if (reset) {
          setHistory([]);
          setHistoryPage(1);
          setHasMoreHistory(false);
        }
        return;
      }

      const response = await apiService.getRecipeHistory(userId, page, HISTORY_BATCH_SIZE);
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
          // Ignorer le fallback local si le cache est indisponible
        }

        const newItems = (response.data.history as HistoryItem[]).map((item) => ({
          ...item,
          image: item.image || imageById.get(item.id),
        }));
        setHistory((prev) => {
          const base = reset ? [] : prev;
          const merged = [...base, ...newItems];
          const deduped = new Map<string, HistoryItem>();
          merged.forEach((item) => deduped.set(item.id, item));
          return Array.from(deduped.values());
        });
        setHistoryPage(page);
        if (typeof response.data.pagination?.hasMore === 'boolean') {
          setHasMoreHistory(response.data.pagination.hasMore);
        } else {
          setHasMoreHistory(newItems.length >= HISTORY_BATCH_SIZE);
        }
      } else if (reset) {
        setHistory([]);
        setHistoryPage(1);
        setHasMoreHistory(false);
      }
    } catch (e) {
      console.error('Erreur lors du chargement de l\'historique:', e);
    } finally {
      setIsLoadingMoreHistory(false);
    }
  };

  const handleHistoryScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom < 200 && hasMoreHistory && !isLoadingMoreHistory) {
      loadHistory(historyPage + 1, false);
    }
  };

  const checkSubscription = async () => {
    try {
      const status = await revenueCatService.getSubscriptionStatus();
      setIsSubscribed(status.isSubscribed);
    } catch (e) {
      console.error(e);
    }
  };

  const loadPantryCount = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        setPantryCount(items.length);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePantryPress = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let ingredients: string[] = [];

      if (stored) {
        const parsed = JSON.parse(stored);

        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'object' && parsed[0].name) {
            ingredients = [JSON.stringify(parsed.map((item: any) => ({
              name: String(item.name || '').trim(),
              ...(item.category ? { category: item.category } : {}),
            })).filter((i: any) => i.name.length > 0))];
          } else {
            ingredients = parsed
              .map((item: any) => typeof item === 'string' ? item.trim() : '')
              .filter((name: string) => name.length > 0);
          }
        }
      }

      router.push({
        pathname: '/ingredient-list',
        params: ingredients.length > 0
          ? { ingredients: ingredients.length === 1 && ingredients[0].startsWith('[') ? ingredients[0] : ingredients.join(',') }
          : {},
      });
    } catch (e) {
      console.error('Erreur lors de la lecture du garde-manger:', e);
      router.push('/ingredient-list');
    }
  };

  const handleHistoryPress = async (item: HistoryItem) => {
    if (item.id.startsWith('mock-')) {
      // Données de test : naviguer avec les données fictives
      const mockRecipe = {
        id: item.id,
        title: item.title,
        difficulty: 'MEDIUM',
        cooking_time: item.cooking_time,
        servings: 2,
        calories: '450',
        proteins: '25g',
        lipids: '15g',
        ingredients: [
          { name: 'Ingrédient test 1', quantity: '100g', icon: '🥘' },
          { name: 'Ingrédient test 2', quantity: '200g', icon: '🥗' },
        ],
        steps: Array(item.stepsCount || 5).fill(0).map((_, i) => ({
          title: `Étape ${i + 1}`,
          description: `Description détaillée de l'étape ${i + 1} pour la recette de test.`
        })),
        image: item.image,
      };

      router.push({
        pathname: '/recipe-detail',
        params: {
          recipe: JSON.stringify(mockRecipe),
          showGenerateButton: 'false',
          isHistory: 'true'
        }
      });
      return;
    }

    try {
      const response = await apiService.getRecipeById(item.id);
      if (response.data?.recipe) {
        const hydratedRecipe = {
          ...response.data.recipe,
          image: response.data.recipe.image || item.image,
        };
        router.push({
          pathname: '/recipe-detail',
          params: {
            recipe: JSON.stringify(hydratedRecipe),
            showGenerateButton: 'false',
            isHistory: 'true'
          }
        });
      }
    } catch (e) {
      console.error('Erreur lors du chargement de la recette:', e);
    }
  };

  return (
    <LinearGradient
      colors={['#F6EEE9', '#FFFFFF']}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      locations={[0, 0.5]}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ overflow: 'visible' }}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
        onScroll={handleHistoryScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>CookEat Ai</Text>
          <View style={styles.streakCard}>
            <View style={styles.streakLeft}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.streakNumber, { color: colors.button }]}>{streakCount}</Text>
                <Text style={{ fontSize: 32, marginLeft: 5 }}>🔥</Text>
              </View>
              <Text style={[styles.streakLabel, { color: colors.button }]}>
                {streakCount > 1 ? I18n.t('home.streak.days') : I18n.t('home.streak.day')}
              </Text>
            </View>
            <View style={styles.streakRight}>
              <View style={styles.weekDaysRow}>
                {Array(7).fill(0).map((_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dayName = date.toLocaleDateString(I18n.locale.startsWith('fr') ? 'fr-FR' : 'en-US', { weekday: 'short' }).slice(0, 2);
                  const isToday = i === 6;
                  const isActive = weekActivity[i];

                  return (
                    <View key={i} style={styles.dayContainer}>
                      <Text style={[styles.dayName, isToday && styles.todayName]}>{dayName}</Text>
                      <View style={[
                        styles.dayCircle,
                        isActive ? { backgroundColor: colors.button } : styles.dayCircleInactive
                      ]}>
                        {isActive && <IconSymbol name="checkmark" size={14} color="white" />}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Upsell Premium - Affiché uniquement si non abonné */}
        {!isSubscribed && (
          <TouchableOpacity
            style={[styles.premiumCard, { marginBottom: 20 }]}
            onPress={() => router.push({ pathname: '/paywall', params: { source: 'home_banner' } })}
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
                  <Text style={styles.premiumTitle}>{I18n.t('profile.premiumTitle')}</Text>
                  <Text style={styles.premiumDescription}>
                    {I18n.t('profile.premiumPrice')}
                  </Text>
                </View>
                <View style={styles.premiumIconContainer}>
                  <IconSymbol name="crown.fill" size={40} color="white" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Garde-manger */}
        <TouchableOpacity
          style={styles.pantryCard}
          onPress={handlePantryPress}
          activeOpacity={0.9}
        >
          <View style={styles.pantryCardHeader}>
            <View style={styles.pantryCardTitleContainer}>
              <IconSymbol name="archivebox" size={24} color={colors.button} />
              <Text style={styles.pantryCardTitle}>{I18n.t('pantry.title')}</Text>
            </View>
            <Text style={[styles.pantryCardLink, { color: colors.button }]}>{I18n.t('common.seeAll')}</Text>
          </View>

          <View style={styles.pantryCardContent}>
            <View style={styles.pantryStatItem}>
              <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.pantryStatText}>
                {pantryCount} {pantryCount <= 1 ? 'ingrédient' : 'ingrédients'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Historique */}
        {history.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Historique</Text>
            {history.map((item) => (
              <RecipeCard 
                key={item.id} 
                item={item as any} 
                onPress={() => handleHistoryPress(item)} 
              />
            ))}
            {isLoadingMoreHistory && (
              <ActivityIndicator style={{ marginTop: 12 }} size="small" color={colors.button} />
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  titleContainer: {
    paddingBottom: 30,
  },
  mainTitle: {
    fontSize: 32,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  introText: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Cronos Pro',
    color: Colors.light.textSecondary,
  },
  streakCard: {
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginTop: 10,
  },
  streakLeft: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#F0F0F0',
  },
  streakNumber: {
    fontSize: 48,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    lineHeight: 52,
  },
  streakLabel: {
    fontSize: 18,
    fontFamily: 'Cronos Pro',
    fontWeight: '600',
  },
  streakRight: {
    flex: 1,
    paddingLeft: 15,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayContainer: {
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    fontSize: 14,
    fontFamily: 'Cronos Pro',
    color: '#AEAEB2',
    fontWeight: '500',
  },
  todayName: {
    color: '#1C1C1E',
    fontWeight: 'bold',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleActive: {
    // backgroundColor: '#FF5C00', // Supprimé au profit du dynamisme
  },
  dayCircleInactive: {
    backgroundColor: '#F2F2F7',
  },
  cardContainer: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontFamily: 'Degular',
    textAlign: 'left',
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontFamily: 'Cronos Pro',
    textAlign: 'left',
    fontSize: 16,
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  premiumCard: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#FDB931',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
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
    fontWeight: 'bold',
    fontFamily: 'Degular',
    letterSpacing: 1,
  },
  premiumTitle: {
    fontFamily: 'Degular',
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    width: '90%',
  },
  premiumDescription: {
    fontFamily: 'Cronos Pro',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  premiumIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pantryCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 2,
  },
  pantryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pantryCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pantryCardTitle: {
    fontSize: 20,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  pantryCardLink: {
    fontSize: 16,
    fontFamily: 'Cronos Pro',
    fontWeight: '600',
  },
  pantryCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pantryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pantryStatText: {
    fontSize: 18,
    fontFamily: 'Cronos Pro',
    color: '#8E8E93',
  },
  pantrySeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 15,
  },
  historyContainer: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Degular',
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 15,
  },
});
