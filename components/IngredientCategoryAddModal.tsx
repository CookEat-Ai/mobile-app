import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ingredientCategories as getIngredientCategories } from '../services/ingredientCategories';
import { pantryIngredientKey as normalizeIngredientName } from '../services/planningPantry';
import { NavigationIconButton } from './NavigationIconButton';
import { IconSymbol } from './ui/IconSymbol';
import { Colors } from '../constants/Colors';
import { font } from '../constants/Layout';

export function IngredientCategoryAddModal({ visible: isCategoryAddModalVisible, initialCategoryId, ingredients, onClose, onAdd }: {
  visible: boolean; initialCategoryId?: string; ingredients: { name: string }[];
  onClose: () => void; onAdd: (items: { name: string; category: string }[]) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width } = useWindowDimensions();
  const chipWidth = (Math.min(width, 640) - 64) / 3;
  const ingredientCategories = useMemo(() => getIngredientCategories(t), [t]);
  const [categoryAddModalCategoryId, setCategoryAddModalCategoryId] = useState<string | null>(null);
  const [selectedIngredientsForCategoryModal, setSelectedIngredientsForCategoryModal] = useState<string[]>([]);
  const [categoryAddModalSearch, setCategoryAddModalSearch] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const categoryAddSlideAnim = useRef(new Animated.Value(screenHeight)).current;
  const deburr = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  useEffect(() => {
    if (!isCategoryAddModalVisible) return;
    setCategoryAddModalCategoryId(initialCategoryId || ingredientCategories[0]?.id || null);
    setSelectedIngredientsForCategoryModal([]);
    setCategoryAddModalSearch('');
    categoryAddSlideAnim.setValue(screenHeight);
    Animated.spring(categoryAddSlideAnim, { toValue: 0, useNativeDriver: false, tension: 50, friction: 8 }).start();
  }, [isCategoryAddModalVisible, initialCategoryId]);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const closeCategoryAddModal = () => {
    Keyboard.dismiss();
    Animated.timing(categoryAddSlideAnim, { toValue: screenHeight, duration: 300, useNativeDriver: false }).start(onClose);
  };
  const toggleCategoryModalIngredient = (name: string) => setSelectedIngredientsForCategoryModal(items => items.includes(name) ? items.filter(item => item !== name) : [...items, name]);
  const confirmCategoryAddModal = () => {
    const items = selectedIngredientsForCategoryModal.filter(name => !ingredients.some(item => normalizeIngredientName(item.name) === normalizeIngredientName(name))).map(name => ({ name, category: ingredientCategories.find(category => category.ingredients.some(item => item.name === name))?.id || categoryAddModalCategoryId || 'other' }));
    onAdd(items);
    closeCategoryAddModal();
  };
  return (
      <Modal
        visible={isCategoryAddModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={closeCategoryAddModal}
      >
        <View
          style={styles.modalOverlay}
          onTouchEnd={(e) => {
            if (e.target === e.currentTarget) closeCategoryAddModal();
          }}
        >
          <Animated.View
            style={[
              styles.modalContent,
              styles.categoryAddModalContent,
              {
                // Le clavier de la recherche recouvrirait le bouton "Ajouter" : on
                // remonte la carte et on réduit sa hauteur max de la même quantité.
                maxHeight: (screenHeight - keyboardHeight) * 0.85,
                marginBottom: keyboardHeight,
                transform: [{ translateY: categoryAddSlideAnim }],
                paddingBottom: 0,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {ingredientCategories.find(c => c.id === categoryAddModalCategoryId)?.title || t('recipeSummary.add')}
              </Text>
              <NavigationIconButton kind="close" onPress={closeCategoryAddModal} style={styles.modalCloseButton} />
            </View>
            {!initialCategoryId && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }} keyboardShouldPersistTaps="handled">
              {ingredientCategories.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected: category.id === categoryAddModalCategoryId }} onPress={() => { setCategoryAddModalCategoryId(category.id); setCategoryAddModalSearch(''); }} style={[styles.manualIngredientItem, { marginRight: 8 }, category.id === categoryAddModalCategoryId && styles.ingredientItemSelected]}><Text style={styles.manualIngredientName}>{category.icon} {category.title}</Text></Pressable>)}
            </ScrollView>}
            <View style={styles.categoryAddModalSearchBar}>
              <IconSymbol name="search" size={18} color="#9A9A9A" />
              <TextInput
                style={styles.categoryAddModalSearchInput}
                placeholder={t('recipeSummary.searchIngredientPlaceholder')}
                placeholderTextColor="#9A9A9A"
                value={categoryAddModalSearch}
                onChangeText={setCategoryAddModalSearch}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                onSubmitEditing={Keyboard.dismiss}
              />
              {categoryAddModalSearch.length > 0 && (
                <TouchableOpacity onPress={() => setCategoryAddModalSearch('')} hitSlop={10}>
                  <IconSymbol name="close" size={18} color="#9A9A9A" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView
              style={styles.categoryAddModalBody}
              contentContainerStyle={styles.categoryAddModalBodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
            >
              {categoryAddModalCategoryId && (() => {
                const category = ingredientCategories.find(c => c.id === categoryAddModalCategoryId);
                if (!category) return null;
                const search = deburr(categoryAddModalSearch);
                const availableIngredients = category.ingredients.filter(
                  (ing: { name: string }) => !ingredients.some(i => normalizeIngredientName(i.name) === normalizeIngredientName(ing.name))
                    && (!search || deburr(ing.name).includes(search))
                );
                if (availableIngredients.length === 0) {
                  return (
                    <Text style={styles.categoryAddModalEmptyText}>
                      {search ? t('recipeSummary.noIngredientFound') : t('recipeSummary.allIngredientsAdded')}
                    </Text>
                  );
                }
                return (
                  <View style={styles.categoryAddModalGrid}>
                    {availableIngredients.map((ingredient: { id: string; name: string; icon: string }) => {
                      const isSelected = selectedIngredientsForCategoryModal.some(
                        n => normalizeIngredientName(n) === normalizeIngredientName(ingredient.name)
                      );
                      return (
                        <Pressable
                          key={ingredient.id}
                          style={({ pressed }) => [
                            styles.manualIngredientItem,
                            { width: chipWidth },
                            isSelected && styles.ingredientItemSelected,
                            pressed && { opacity: 0.7 }
                          ]}
                          onPress={() => toggleCategoryModalIngredient(ingredient.name)}
                          hitSlop={8}
                        >
                          <Text style={styles.ingredientIcon}>{ingredient.icon}</Text>
                          <Text style={[styles.manualIngredientName, isSelected && styles.ingredientNameSelected]}>
                            {ingredient.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              })()}
            </ScrollView>
            <View style={[styles.categoryAddModalFooter, { paddingBottom: keyboardHeight > 0 ? 16 : Math.max(insets.bottom, 16) + 8 }]}>
              <TouchableOpacity
                style={[styles.categoryAddModalButton, selectedIngredientsForCategoryModal.length === 0 && styles.categoryAddModalButtonDisabled]}
                onPress={confirmCategoryAddModal}
                disabled={selectedIngredientsForCategoryModal.length === 0}
              >
                <Text style={styles.categoryAddModalButtonText}>{t('recipeSummary.add')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
  );
}
const styles = StyleSheet.create({
  categoryAddModalBody: {
    maxHeight: '70%',
    // La barre de recherche prend de la hauteur : sans flexShrink, la liste pousse
    // le footer (bouton Ajouter) hors de la modale sur les petits écrans.
    flexShrink: 1,
  },
  categoryAddModalBodyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20,
  },
  categoryAddModalButton: {
    backgroundColor: Colors.light.button,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryAddModalButtonDisabled: {
    opacity: 0.5,
  },
  categoryAddModalButtonText: {
    fontSize: 18,
    color: 'white',
    fontFamily: 'Degular'
  },
  categoryAddModalContent: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  categoryAddModalEmptyText: {
    fontFamily: 'CronosPro',
    fontSize: 15,
    color: '#9A9A9A',
    textAlign: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  categoryAddModalFooter: {
    padding: 24,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginHorizontal: -24, // Pour toucher les bords de la modale
  },
  categoryAddModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  categoryAddModalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 15,
    minHeight: 48,
    marginBottom: 16,
  },
  categoryAddModalSearchInput: {
    flex: 1,
    fontFamily: 'CronosPro',
    fontSize: 16,
    color: '#000',
    minWidth: 0,
    paddingVertical: 0,
  },
  ingredientIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  ingredientItemSelected: {
    backgroundColor: Colors.light.button,
    borderColor: Colors.light.button,
  },
  ingredientNameSelected: {
    fontSize: 12,
    fontFamily: 'CronosProBold',
    color: 'white',
    textAlign: 'center'
  },
  manualIngredientItem: {
    // width fourni à l'usage (dérivé de la largeur de fenêtre courante).
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 80,
    justifyContent: 'center',
  },
  manualIngredientName: {
    fontSize: 12,
    fontFamily: 'CronosPro',
    color: Colors.light.text,
    textAlign: 'center'
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 640,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    // Sur tablette la feuille est recentrée au lieu de traverser tout l'écran.
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: font(24),
    color: '#000',
    fontFamily: 'Degular'
  },
});
