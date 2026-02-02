import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, Text } from 'react-native';
import { initPersistence } from '../src/store/todosStore';
import { signInAnonymously } from '../src/lib/supabase';

/**
 * Root layout - wraps the app with required providers
 */
export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        // Initialize local persistence
        await initPersistence();
        
        // Sign in anonymously to Supabase
        const userId = await signInAnonymously();
        console.log('Signed in as:', userId);
        
        setIsReady(true);
      } catch (err) {
        console.error('Init error:', err);
        setIsReady(true); // Still allow app to work offline
      }
    }
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: styles.content,
            animation: 'none',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    backgroundColor: '#FFFFFF',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
