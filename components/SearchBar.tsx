import React from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { IconSymbol } from './ui/IconSymbol';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSearch?: () => void;
}

export default function SearchBar({ value, onChangeText, placeholder = "Search here", onSearch }: SearchBarProps) {
  const colors = Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <IconSymbol
        name={Platform.OS === 'ios' ? 'magnifyingglass' : "search"}
        size={20}
        color={colors.icon}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
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
    borderRadius: 2000,
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
  },
}); 