import { Column, Table, Schema } from '@powersync/react-native';

/**
 * PowerSync schema definition
 * Mirrors the PostgreSQL todos table structure
 */
const TodosTable = new Table({
    id: new Column({ type: 'text' }),
    user_id: new Column({ type: 'text' }),
    content: new Column({ type: 'text' }),
    is_completed: new Column({ type: 'integer' }), // boolean as 0/1
    due_date: new Column({ type: 'text' }), // ISO timestamp
    position: new Column({ type: 'integer' }),
    created_at: new Column({ type: 'text' }),
    updated_at: new Column({ type: 'text' }),
});

export const AppSchema = new Schema({
    todos: TodosTable,
});

export type Database = (typeof AppSchema)['types'];
