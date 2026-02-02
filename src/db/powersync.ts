import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './schema';

/**
 * PowerSync database instance
 * Connects to local SQLite and syncs with the PowerSync service
 */
export const powerSyncDb = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
        dbFilename: 'aside.sqlite',
    },
});

/**
 * PowerSync connection configuration
 */
export const POWERSYNC_CONFIG = {
    // Local development URL (Docker)
    backendUrl: 'http://localhost:8080',
    // In production, this would be your PowerSync cloud URL
};

/**
 * Initialize PowerSync connection
 * Call this on app startup
 */
export async function initPowerSync(): Promise<void> {
    try {
        // Initialize the database
        await powerSyncDb.init();

        // Connect to the sync service
        // In a real app, you'd authenticate first and pass a JWT
        await powerSyncDb.connect({
            endpoint: POWERSYNC_CONFIG.backendUrl,
        });

        console.log('PowerSync connected successfully');
    } catch (error) {
        console.error('PowerSync connection failed:', error);
        // The app will work offline - local SQLite is always available
    }
}

/**
 * Disconnect PowerSync (cleanup)
 */
export async function disconnectPowerSync(): Promise<void> {
    await powerSyncDb.disconnect();
}
