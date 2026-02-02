import {
    AbstractPowerSyncDatabase,
    PowerSyncBackendConnector,
    UpdateType,
} from '@powersync/react-native';
import { supabase } from './supabase';

/**
 * PowerSync connector for Supabase
 * Handles authentication and CRUD operations
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
    /**
     * Get PowerSync credentials from Supabase session
     */
    async fetchCredentials() {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('No Supabase session');
        }

        const powersyncUrl = process.env.EXPO_PUBLIC_POWERSYNC_URL || process.env.POWERSYNC_URL || '';

        return {
            endpoint: powersyncUrl,
            token: session.access_token,
            expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined,
        };
    }

    /**
     * Upload local changes to Supabase
     */
    async uploadData(database: AbstractPowerSyncDatabase) {
        const transaction = await database.getNextCrudTransaction();

        if (!transaction) {
            return;
        }

        try {
            for (const op of transaction.crud) {
                const table = op.table;
                const record = op.opData;

                switch (op.op) {
                    case UpdateType.PUT:
                        // Insert or update
                        const { error: upsertError } = await supabase
                            .from(table)
                            .upsert(record);
                        if (upsertError) throw upsertError;
                        break;

                    case UpdateType.PATCH:
                        // Update only
                        const { error: updateError } = await supabase
                            .from(table)
                            .update(record)
                            .eq('id', op.id);
                        if (updateError) throw updateError;
                        break;

                    case UpdateType.DELETE:
                        // Delete
                        const { error: deleteError } = await supabase
                            .from(table)
                            .delete()
                            .eq('id', op.id);
                        if (deleteError) throw deleteError;
                        break;
                }
            }

            await transaction.complete();
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    }
}
