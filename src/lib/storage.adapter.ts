import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Universal Storage Adapter
 * Wraps AsyncStorage for Native and localStorage for Web.
 * Ensures the 'storage' interface is always met.
 */

// Debugging
console.log('[Debug] storage.adapter: Loading adapter. Platform:', Platform.OS);

export const UniversalStorage = {
    getItem: async (key: string): Promise<string | null> => {
        console.log('[Debug] UniversalStorage: getItem', key);
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
            return null;
        }
        return await AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string): Promise<void> => {
        console.log('[Debug] UniversalStorage: setItem', key);
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
            }
            return;
        }
        await AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
        console.log('[Debug] UniversalStorage: removeItem', key);
        if (Platform.OS === 'web') {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
            return;
        }
        await AsyncStorage.removeItem(key);
    },
};
