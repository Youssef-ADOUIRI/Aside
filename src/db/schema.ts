import { column, Schema, Table } from '@powersync/react-native';

/**
 * PowerSync schema definition
 * Mirrors the Supabase todos table structure
 */
const todos = new Table({
    // Note: 'id' is automatically included as the primary key
    user_id: column.text,
    content: column.text,
    is_completed: column.integer, // boolean as 0/1
    due_date: column.text, // ISO timestamp or null
    position: column.integer,
    created_at: column.text,
    updated_at: column.text,
});

export const AppSchema = new Schema({
    todos,
});

export type Database = (typeof AppSchema)['types'];
export type TodoRecord = Database['todos'];
