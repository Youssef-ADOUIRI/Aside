import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { adapter } from './storage'; // Will automatically pick .web.ts or .ts
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Lazy-loaded supabase client to avoid SSR issues
let _supabase: SupabaseClient | null = null;

/**
 * Get Supabase client (lazy initialization for SSR compatibility)
 */
export function getSupabase(): SupabaseClient {
    if (!_supabase) {
        console.log('[Debug] Supabase: Initializing client with Platform Adapter');

        const clientOptions: any = {
            auth: {
                storage: adapter, // Uses purely web or purely native implementation
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false,
                debug: true,
            },
            global: {
                fetch: (url: any, options: any) => {
                    return fetch(url, options);
                }
            }
        };

        console.log('[Debug] Supabase: Options prepared, creating client...');
        _supabase = createClient(supabaseUrl, supabaseKey, clientOptions);
        console.log('[Debug] Supabase: Client created successfully');
    }
    return _supabase;
}

// For backward compatibility
export const supabase = typeof window !== 'undefined' ? getSupabase() : null as any;

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    const client = getSupabase();
    const { data: { user } } = await client.auth.getUser();
    return user?.id || null;
}

/**
 * Anonymous sign in - creates a unique user for this device
 */
export async function signInAnonymously(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    const client = getSupabase();

    // Check if already signed in
    const { data: { session } } = await client.auth.getSession();
    if (session?.user?.id) {
        return session.user.id;
    }

    // Sign in anonymously
    const { data, error } = await client.auth.signInAnonymously();
    if (error) {
        console.error('Anonymous sign in failed:', error);
        return null;
    }
    return data.user?.id || null;
}
