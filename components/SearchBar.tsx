import { AppRadii } from '../constants/AppTheme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { IconSymbol } from './ui/IconSymbol';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSearch?: () => void;
}

export default function SearchBar({ value, onChangeText, onSearch, placeholder }: SearchBarProps) {
  const { t } = useTranslation();
  const colors = Colors.light;


  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <IconSymbol
        name={'magnifyingglass'}
        size={20}
        color={colors.icon}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || t(`common.searchPlaceholder`)}
        placeholderTextColor={colors.icon}
        onSubmitEditing={onSearch}
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: AppRadii.control,
    minHeight: 52,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'CronosPro',
  },
}); 