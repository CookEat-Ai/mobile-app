import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      <TouchableOpacity style={styles.profileSection} onPress={onProfilePress}>
        <View style={[styles.avatar, { borderColor: colors.border }]}>
          {userImage ? (
            <Image source={userImage} style={styles.avatarImage} />
          ) : (
            <IconSymbol name="person" size={24} color={colors.primary} />
          )}
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>
          {userName}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
        <IconSymbol name="notifications-outline" size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontSize: 18,
    fontWeight: '600',
  },
  notificationButton: {
    padding: 8,
  },
}); 