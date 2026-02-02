import { observable } from '@legendapp/state';
import { Platform } from 'react-native';
import type { Todo } from '../types';

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
 * Provides high-performance reactive state management
 */
export const todosStore$ = observable<{
    todos: Todo[];
    focusedId: string | null;
}>({
    todos: [createTodo(0)], // Start with one empty row
    focusedId: null,
});

/**
 * Initialize persistence - call this from _layout.tsx useEffect
 * This defers AsyncStorage access to avoid SSR issues
 */
export async function initPersistence(): Promise<void> {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    try {
        const { configureObservablePersistence, persistObservable } = await import(
            '@legendapp/state/persist'
        );
        const { ObservablePersistAsyncStorage } = await import(
            '@legendapp/state/persist-plugins/async-storage'
        );
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;

        configureObservablePersistence({
            pluginLocal: ObservablePersistAsyncStorage,
            localOptions: {
                asyncStorage: {
                    AsyncStorage,
                },
            },
        });

        persistObservable(todosStore$, {
            local: 'aside-todos',
        });
    } catch (error) {
        console.warn('Persistence initialization failed:', error);
    }
}

/**
 * Store actions - Notepad Logic implementation
 */
export const todoActions = {
    /**
     * Update todo content with debounced persistence
     */
    updateContent(id: string, content: string): void {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);
        if (index !== -1) {
            todosStore$.todos[index].content.set(content);
            todosStore$.todos[index].updatedAt.set(new Date().toISOString());
        }
    },

    /**
     * Set the parsed due date silently (no UI popup)
     */
    setDueDate(id: string, dueDate: string | null): void {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);
        if (index !== -1) {
            todosStore$.todos[index].dueDate.set(dueDate);
            todosStore$.todos[index].updatedAt.set(new Date().toISOString());
        }
    },

    /**
     * Handle Enter key - create new row below current
     */
    insertAfter(id: string): string {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);
        if (index === -1) return id;

        // Create new todo at next position
        const newTodo = createTodo(index + 1);

        // Update positions of all todos after this one
        const updatedTodos = [...todos];
        for (let i = index + 1; i < updatedTodos.length; i++) {
            updatedTodos[i] = { ...updatedTodos[i], position: updatedTodos[i].position + 1 };
        }

        // Insert new todo
        updatedTodos.splice(index + 1, 0, newTodo);
        todosStore$.todos.set(updatedTodos);
        todosStore$.focusedId.set(newTodo.id);

        return newTodo.id;
    },

    /**
     * Handle Backspace on empty row - delete and focus previous
     */
    deleteIfEmpty(id: string): string | null {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);

        // Don't delete if it's the only row or not empty
        if (index === -1 || todos.length === 1 || todos[index].content !== '') {
            return null;
        }

        // Get previous todo ID for focus
        const prevId = index > 0 ? todos[index - 1].id : todos[1]?.id || null;

        // Remove the todo and update positions
        const updatedTodos = todos
            .filter((t) => t.id !== id)
            .map((t, i) => ({ ...t, position: i }));

        todosStore$.todos.set(updatedTodos);
        todosStore$.focusedId.set(prevId);

        return prevId;
    },

    /**
     * Toggle completion status
     */
    toggleComplete(id: string): void {
        const todos = todosStore$.todos.get();
        const index = todos.findIndex((t) => t.id === id);
        if (index !== -1) {
            const current = todosStore$.todos[index].isCompleted.get();
            todosStore$.todos[index].isCompleted.set(!current);
            todosStore$.todos[index].updatedAt.set(new Date().toISOString());
        }
    },

    /**
     * Set which todo is currently focused
     */
    setFocused(id: string | null): void {
        todosStore$.focusedId.set(id);
    },
};
