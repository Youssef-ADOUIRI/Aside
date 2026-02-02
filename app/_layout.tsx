import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SessionProvider, useSession } from './ctx';

function InitialLayout() {
  const { session, isLoading } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)'; // If we had groups, but checking manual route
    const isLoginPage = segments[0] === 'login';
    const isSignUpPage = segments[0] === 'signup';

    if (!session) {
      // If not authenticated, redirect to login (unless already on public auth pages)
      if (!isLoginPage && !isSignUpPage) {
        router.replace('/login');
      }
    } else {
      // If authenticated, redirect to home if user tries to access auth pages
      if (isLoginPage || isSignUpPage) {
        router.replace('/');
      }
    }
  }, [session, isLoading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <View style={styles.container}>
        <InitialLayout />
      </View>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
