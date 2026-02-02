import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './schema';
import { SupabaseConnector } from '../lib/powersync-connector';
import { signInAnonymously } from '../lib/supabase';

/**
 * PowerSync database instance
 */
export const db = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
        dbFilename: 'aside.sqlite',
    },
});

/**
 * Connector instance
 */
const connector = new SupabaseConnector();

/**
 * Initialize PowerSync with Supabase
 */
export async function initDatabase(): Promise<void> {
    try {
        // First, ensure user is authenticated
        const userId = await signInAnonymously();
        if (!userId) {
            console.warn('Could not authenticate, running in offline mode');
            await db.init();
            return;
        }

        console.log('Authenticated as:', userId);

        // Initialize the database
        await db.init();

        // Connect to sync service
        await db.connect(connector);

        console.log('PowerSync connected successfully');
    } catch (error) {
        console.error('Database initialization failed:', error);
        // Still initialize for offline use
        await db.init();
    }
}

/**
 * Disconnect and cleanup
 */
export async function closeDatabase(): Promise<void> {
    await db.disconnectAndClear();
}

export { AppSchema } from './schema';
