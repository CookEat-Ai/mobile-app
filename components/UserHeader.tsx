import { t } from "i18next";
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { IconSymbol } from './ui/IconSymbol';

interface UserHeaderProps {
  userName: string;
  userImage?: any;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export default function UserHeader({
  userName,
  userImage,
  onNotificationPress,
  onProfilePress
}: UserHeaderProps) {
  const colors = Colors.light;

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        {/* <View style={[styles.avatar, { borderColor: colors.border }]}>
          {userImage ? (
            <Image source={userImage} style={styles.avatarImage} />
          ) : (
            <IconSymbol name="person" size={24} color={colors.button} />
          )}
        </View> */}
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginRight: 12, fontFamily: 'Degular' }}>👋🏼</Text>
        <Text style={[styles.userName, { color: colors.text }]}>
          {t('home.hi')}
        </Text>
      </View>

      <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
        <IconSymbol name={Platform.OS === 'ios' ? "bell" : "notifications-outline"} size={24} color={colors.button} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    marginRight: 12,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Degular',
  },
  notificationButton: {
    padding: 8,
  },
}); 