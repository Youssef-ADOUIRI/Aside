import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, Platform, Keyboard, KeyboardAvoidingView, Text, Pressable } from 'react-native';
import { getSupabase } from '../src/lib/supabase';
import { useRouter } from 'expo-router';

/**
 * Minimalist Login Screen
 * Two inputs centered. No labels. Invisible UX.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorVibration, setErrorVibration] = useState(false);
  const [feedback, setFeedback] = useState('');
  
  const passwordRef = useRef<TextInput>(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    setFeedback('');
    
    console.log('[Debug] Login: Starting auth', { email });

    try {
        const { error, data } = await getSupabase().auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        console.log('[Debug] Login: Auth Result', { error, hasData: !!data });

        if (error) {
          console.error('[Debug] Login Error:', error);
          setLoading(false);
          setFeedback(error.message);
          triggerErrorFeedback();
        } else {
          // Session active, RootLayout will redirect
        }
    } catch (err) {
        console.error('[Debug] Login Exception:', err);
        setLoading(false);
        setFeedback('Unexpected error occurred');
    }
  };

  const triggerErrorFeedback = () => {
    setErrorVibration(true);
    setTimeout(() => setErrorVibration(false), 500);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.centerContent}
      >
        <TextInput
          style={[styles.input, errorVibration && styles.inputError]}
          placeholder="email"
          placeholderTextColor="#A0A0A0"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          autoFocus={true}
          // Web tweaks
          {...Platform.select({ web: { outlineStyle: 'none' } as any })}
          editable={!loading}
        />
        
        <TextInput
          ref={passwordRef}
          style={[styles.input, errorVibration && styles.inputError]}
          placeholder="password"
          placeholderTextColor="#A0A0A0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          // Web tweaks
          {...Platform.select({ web: { outlineStyle: 'none' } as any })}
          editable={!loading}
        />

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        {/* Link to Signup */}
        <Pressable onPress={() => router.replace('/signup')}>
          <Text style={styles.toggleText}>
            new? create account
          </Text>
        </Pressable>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { height: '100vh' }
    })
  } as any,
  centerContent: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: 40,
    gap: 20, // Space between inputs
  },
  input: {
    fontSize: 24,
    color: '#000',
    paddingVertical: 10,
    borderBottomWidth: 0, 
    textAlign: 'center',
    minHeight: 50,
  },
  inputError: {
    color: 'red',
  },
  toggleText: {
    marginTop: 20,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    opacity: 0.8,
  },
  feedback: {
    marginTop: 10,
    fontSize: 14,
    color: 'red',
    textAlign: 'center',
  }
});
