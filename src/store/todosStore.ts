import { observable } from '@legendapp/state';
import type { Todo } from '../types';
import { getSupabase, getCurrentUserId } from '../lib/supabase';

/**
 * Generate a unique ID for new todos
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new empty todo at specified position
 */
function createTodo(position: number): Todo {
    const now = new Date().toISOString();
    return {
        id: generateId(),
        content: '',
        isCompleted: false,
        dueDate: null,
        position,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Observable store for todos using Legend-State
 */
export const todosStore$ = observable<{
    todos: Todo[];
    focusedId: string | null;
    userId: string | null;
    syncing: boolean;
}>({
    todos: [createTodo(0)],
    focusedId: null,
    userId: null,
    syncing: false,
});

/**
 * Initialize persistence - loads from Supabase
 */
export async function initPersistence(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        const userId = await getCurrentUserId();
        if (userId) {
            todosStore$.userId.set(userId);
            // Load todos from Supabase
            const { data, error } = await getSupabase()
                .from('todos')
                .select('*')
                .order('position', { ascending: true });

            if (data && data.length > 0) {
                const todos: Todo[] = data.map((row) => ({
                    id: row.id,
                    content: row.content || '',
                    isCompleted: row.is_completed || false,
                    dueDate: row.due_date || null,
                    position: row.position || 0,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at,
                }));
                todosStore$.todos.set(todos);
            }
        }
    } catch (error) {
        console.warn('Could not load from cloud, using local data');
    }
}

/**
 * Sync a todo to Supabase
 */
async function syncTodo(todo: Todo): Promise<void> {
    const userId = todosStore$.userId.get();
    if (!userId) return;

    try {
        await getSupabase().from('todos').upsert({
            id: todo.id,
            user_id: userId,
            content: todo.content,
            is_completed: todo.isCompleted,
            due_date: todo.dueDate,
            position: todo.position,
            created_at: todo.createdAt,
            updated_at: todo.updatedAt,
        });
    } catch (error) {
        console.warn('Sync failed:', error);
    }
}

/**
 * Delete a todo from Supabase
 */
async function deleteTodoFromCloud(id: string): Promise<void> {
    const userId = todosStore$.userId.get();
    if (!userId) return;

    try {
        await getSupabase().from('todos').delete().eq('id', id);
    } catch (error) {
        console.warn('Delete sync failed:', error);
    }
}

/**
 * Store actions - Notepad Logic implementation
 */
export const todoActions = {
    updateContent(id: string, content: string): void {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);
        if (index !== -1) {
            const now = new Date().toISOString();
            const todo = { ...todos[index], content, updatedAt: now };
            todosStore$.todos[index].set(todo);
            syncTodo(todo);
        }
    },

    setDueDate(id: string, dueDate: string | null): void {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);
        if (index !== -1) {
            const now = new Date().toISOString();
            const todo = { ...todos[index], dueDate, updatedAt: now };
            todosStore$.todos[index].set(todo);
            syncTodo(todo);
        }
    },

    insertAfter(id: string): string {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);
        if (index === -1) return id;

        const newTodo = createTodo(index + 1);
        const updatedTodos = [...todos];

        for (let i = index + 1; i < updatedTodos.length; i++) {
            updatedTodos[i] = { ...updatedTodos[i], position: updatedTodos[i].position + 1 };
        }

        updatedTodos.splice(index + 1, 0, newTodo);
        todosStore$.todos.set(updatedTodos);
        todosStore$.focusedId.set(newTodo.id);

        syncTodo(newTodo);
        return newTodo.id;
    },

    deleteIfEmpty(id: string): string | null {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);

        if (index === -1 || todos.length === 1 || todos[index].content !== '') {
            return null;
        }

        const prevId = index > 0 ? todos[index - 1].id : todos[1]?.id || null;
        const updatedTodos = todos
            .filter((t) => t.id !== id)
            .map((t, i) => ({ ...t, position: i }));

        todosStore$.todos.set(updatedTodos);
        todosStore$.focusedId.set(prevId);

        deleteTodoFromCloud(id);
        return prevId;
    },

    toggleComplete(id: string): void {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);
        if (index !== -1) {
            const now = new Date().toISOString();
            const todo = {
                ...todos[index],
                isCompleted: !todos[index].isCompleted,
                updatedAt: now,
            };
            todosStore$.todos[index].set(todo);
            syncTodo(todo);
        }
    },

    setFocused(id: string | null): void {
        todosStore$.focusedId.set(id);
    },
};
