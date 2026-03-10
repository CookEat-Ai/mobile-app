import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router'
import { Colors } from '../constants/Colors';
import { IconSymbol } from '../components/ui/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wave } from 'react-native-animated-spinkit';
import { useVoice, resetVoiceCompletely } from '../hooks/useVoice';
import apiService from '../services/api';
import I18n from '../i18n';

interface PantryItem {
  id: string;
  name: string;
  // icon: string;
  category: string;
  addedAt: string;
}

const STORAGE_KEY = 'pantry_ingredients';

export default function PantryScreen() {
  const colors = Colors.light;
  const insets = useSafeAreaInsets();
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Utiliser le hook useVoice
  const { isRecording, liveText, startRecording, stopRecording, clearLiveText } = useVoice({
    onTextReceived: (text) => {
      // Le texte est automatiquement stocké dans liveText par le hook
    },
    onRecordingStateChange: (recording) => {
      // L'état d'enregistrement est automatiquement géré par le hook
    }
  });

  useEffect(() => {
    loadPantryItems();

    // Réinitialiser complètement Voice quand on arrive sur cette page
    resetVoiceCompletely();
  }, []);



  const handleVoiceProcessing = async () => {
    if (liveText.length < 5) {
      return;
    }

    setIsLoading(true);
    try {
      // Traiter le texte vocal
      const response = await apiService.processVoiceIngredients(liveText);
      const ingredients = response.data?.ingredients || [];

      // Créer les nouveaux items
      const newItems: PantryItem[] = ingredients.map((ing, index) => ({
        id: (Date.now() + index).toString(),
        name: ing.name,
        category: ing.category || 'other',
        addedAt: new Date().toISOString(),
      }));

      // Remplacer la liste existante
      setPantryItems(newItems);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await savePantryItems(newItems);
    } catch (error) {
      console.error('Erreur lors du traitement vocal:', error);
      Alert.alert(
        I18n.t('common.error'),
        I18n.t('pantry.voiceError')
      );
    }
    clearLiveText();
    setIsLoading(false);
  };

  const handleMicroButtonPress = () => {
    if (isRecording) {
      stopRecording();
      handleVoiceProcessing();
    } else {
      startRecording();
    }
  };

  const loadPantryItems = async () => {
    try {
      const storedItems = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedItems) {
        setPantryItems(JSON.parse(storedItems));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des ingrédients:', error);
    }
  };

  const savePantryItems = async (items: PantryItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des ingrédients:', error);
    }
  };

  const addItem = async (ingredientName: string) => {
    if (!ingredientName.trim()) {
      Alert.alert(I18n.t('pantry.error'), I18n.t('pantry.nameRequired'));
      return;
    }

    // Capitaliser la première lettre
    const capitalizedName = ingredientName.trim().charAt(0).toUpperCase() + ingredientName.trim().slice(1).toLowerCase();

    const newItem: PantryItem = {
      id: Date.now().toString(),
      name: capitalizedName,
      category: 'personnalisé',
      addedAt: new Date().toISOString(),
    };

    const updatedItems = [...pantryItems, newItem];
    setPantryItems(updatedItems);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await savePantryItems(updatedItems);
  };

  const showAddIngredientAlert = () => {
    Alert.prompt(
      I18n.t('pantry.addIngredient'),
      I18n.t('pantry.ingredientNamePlaceholder'),
      [
        { text: I18n.t('common.cancel'), style: 'cancel' },
        {
          text: I18n.t('pantry.add'),
          onPress: (ingredientName) => {
            if (ingredientName) {
              addItem(ingredientName);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const removeItem = async (itemId: string) => {
    Alert.alert(
      I18n.t('pantry.deleteTitle'),
      I18n.t('pantry.deleteMessage'),
      [
        { text: I18n.t('common.cancel'), style: 'cancel' },
        {
          text: I18n.t('pantry.delete'),
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const updatedItems = pantryItems.filter(item => item.id !== itemId);
            setPantryItems(updatedItems);
            await savePantryItems(updatedItems);
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    router.push({
      pathname: '/ingredient-list',
      params: {
        ingredients: JSON.stringify(pantryItems.map(item => ({
          name: item.name,
          ...(item.category && item.category !== 'other' ? { category: item.category } : {}),
        }))),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={24} color={colors.text} weight="bold" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{I18n.t('pantry.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Statistiques */}
        {/* <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{pantryItems.length}</Text>
            <Text style={styles.statLabel}>{I18n.t('pantry.ingredients')}</Text>
          </View>
        </View> */}

        {/* Liste des ingrédients */}
        <View style={{ ...styles.section, marginBottom: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
            <Text style={styles.sectionTitle}>{I18n.t('pantry.myIngredients')}</Text>

            {/* Bouton d'ajout */}
            <View style={{ ...styles.section, marginBottom: 0 }}>
              <TouchableOpacity
                style={{ ...styles.addButton, padding: 7, paddingHorizontal: 15, backgroundColor: 'white', borderColor: Colors.light.button, borderWidth: 2 }}
                onPress={showAddIngredientAlert}
              >
                <IconSymbol
                  name="plus"
                  size={15}
                  color={Colors.light.button}
                  weight="bold"
                />
                <Text style={{ ...styles.addButtonText, color: Colors.light.button }}>
                  {I18n.t('pantry.add')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {pantryItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🥘</Text>
              <Text style={styles.emptyStateTitle}>{I18n.t('pantry.emptyTitle')}</Text>
              <Text style={styles.emptyStateDescription}>
                {I18n.t('pantry.emptyDescription')}
              </Text>
            </View>
          ) : (
            pantryItems.map((item) => <View key={item.id} style={styles.pantryItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeItem(item.id)}
              >
                <IconSymbol name="trash" size={24} color='gray' weight="bold" />
              </TouchableOpacity>
            </View>)
          )}
        </View>

        {/* Bouton micro */}
        <View style={{ ...styles.section, marginBottom: 10 }}>
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: 'white', borderColor: !isRecording ? Colors.light.button : '#DB5244', borderWidth: 2 },
              isRecording && styles.recordingButton
            ]}
            onPress={handleMicroButtonPress}
          >
            <IconSymbol
              // @ts-ignore
              name={isRecording ? "microphone" : "microphone.slash"}
              size={20}
              color={!isRecording ? Colors.light.button : "white"}
              weight="bold"
            />
            <Text style={{ ...styles.addButtonText, color: !isRecording ? Colors.light.button : "white" }}>
              {isRecording ? I18n.t('pantry.stopRecording') : I18n.t('pantry.voice')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bouton generation */}
      {pantryItems.length > 0 && <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
      >
        <Text style={{ ...styles.addButtonText, fontSize: 18, marginRight: 10, marginLeft: 0 }}>
          {I18n.t('pantry.continue')}
        </Text>
        <IconSymbol
          name={'arrow.right'}
          size={20}
          color="white"
          weight="bold"
        />
      </TouchableOpacity>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9E9E9',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    textAlign: 'center',
    color: Colors.light.text,
    fontFamily: 'Degular'
  },
  headerSpacer: {
    width: 34,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    color: Colors.light.button,
    fontFamily: 'Degular'
  },
  statLabel: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    marginTop: 5,
  },
  section: {
    marginTop: 10,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 28,
    color: Colors.light.button,
    fontFamily: 'Degular'
  },
  emptyState: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: Colors.light.text,
    marginBottom: 8,
    fontFamily: 'Degular'
  },
  emptyStateDescription: {
    fontSize: 14,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  pantryItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  itemName: {
    fontSize: 18,
    fontFamily: 'CronosPro',
    color: Colors.light.text,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    backgroundColor: Colors.light.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingButton: {
    backgroundColor: '#DB5244',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 8,
    fontFamily: 'Degular'
  },
  continueButton: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    marginHorizontal: 20,
    backgroundColor: Colors.light.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voiceDescription: {
    fontSize: 16,
    fontFamily: 'CronosPro',
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(238, 238, 238, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 40,
    fontSize: 20,
    color: Colors.light.text,
    fontFamily: 'Degular',
    textAlign: 'center',
  },

}); 