import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const SECURE_KEY = 'cookeat_device_id';
const ASYNC_BACKUP_KEY = 'cookeat_device_id_backup';

/**
 * Récupère un identifiant unique pour l'appareil via une cascade de stockage :
 * SecureStore (Keychain/Keystore) → AsyncStorage (backup) → génération UUID.
 * Toute lecture réussie est systématiquement répliquée dans l'autre stockage
 * pour maximiser la résilience face aux pertes silencieuses de SecureStore.
 */
export const getUniqueDeviceId = async (): Promise<string> => {
  try {
    // 1. Primary : SecureStore (Keychain iOS / EncryptedSharedPrefs Android)
    let deviceId = await SecureStore.getItemAsync(SECURE_KEY);

    if (deviceId) {
      AsyncStorage.setItem(ASYNC_BACKUP_KEY, deviceId).catch(() => { });
      return deviceId;
    }

    // 2. Fallback : AsyncStorage backup
    deviceId = await AsyncStorage.getItem(ASYNC_BACKUP_KEY);

    if (deviceId) {
      SecureStore.setItemAsync(SECURE_KEY, deviceId).catch(() => { });
      return deviceId;
    }

    // 3. Aucun ID trouvé : générer et persister dans les deux
    deviceId = uuid.v4() as string;

    await Promise.all([
      SecureStore.setItemAsync(SECURE_KEY, deviceId).catch(() => { }),
      AsyncStorage.setItem(ASYNC_BACKUP_KEY, deviceId).catch(() => { }),
    ]);

    return deviceId;
  } catch (error) {
    console.error('[DeviceStorage] Erreur critique getUniqueDeviceId:', error);

    try {
      const fallback = await AsyncStorage.getItem(ASYNC_BACKUP_KEY);
      if (fallback) return fallback;

      const newId = uuid.v4() as string;
      await AsyncStorage.setItem(ASYNC_BACKUP_KEY, newId);
      return newId;
    } catch {
      return uuid.v4() as string;
    }
  }
};
