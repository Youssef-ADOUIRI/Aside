import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Native Implementation of Storage
 * Uses AsyncStorage.
 */
console.log('[Debug] storage.ts: Loading Native storage adapter');

export const adapter = AsyncStorage;
