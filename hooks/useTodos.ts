import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../src/lib/supabase';
import { useSession } from '../app/ctx';
import * as chrono from 'chrono-node';

export interface Todo {
    id: string;
    text: string;
    position: number;
    due_date?: string | null; // ISO Date String
    list_id?: string | null;
}

export function useTodos(listId: string | null) {
    // Initialize with empty array
    const [todos, setTodos] = useState<Todo[]>([]);

    // Get session from global context
    const { session } = useSession();
    const userId = session?.user?.id;

    // Helper to generate valid UUID v4 (Postgres requires UUID, not random string)
    const genId = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // Helper: Smart Parse Date
    const smartParse = (text: string) => {
        // Use UK/International strict mode (DD/MM)
        // User explicitly stated "10/02 is 10th of february"
        const results = chrono.en.GB.parse(text);
        if (results.length > 0) {
            // Get the first date found
            const date = results[0].start.date();
            return {
                date: date.toISOString(),
                hasDate: true
            };
        }
        return { date: null, hasDate: false };
    };

    // Load when User ID or listId changes
    useEffect(() => {
        if (userId && listId) {
            loadTodos(userId, listId);
        } else {
            setTodos([]);
        }
    }, [userId, listId]);

    const loadTodos = async (uid: string, lid: string) => {
        try {
            console.log('[Sync] Loading todos for user:', uid, 'list:', lid);
            const { data, error } = await getSupabase()
                .from('todos')
                .select('*')
                .eq('user_id', uid)
                .eq('list_id', lid)
                .order('position', { ascending: true });

            if (error) throw error;

            console.log('[Sync] Loaded items:', data?.length);

            if (data && data.length > 0) {
                setTodos(data.map((t: any) => ({
                    id: t.id,
                    text: t.content || '',
                    position: t.position || 0,
                    due_date: t.due_date || null,
                    list_id: t.list_id || null,
                })));
            } else {
                setTodos([{ id: genId(), text: '', position: 0, list_id: lid }]);
            }
        } catch (e) {
            console.error('[Sync] Load Failed:', e);
            setTodos([{ id: genId(), text: '', position: 0, list_id: listId }]);
        }
    };

    // Background sync (optimistic)
    const syncInsert = useCallback((todo: Todo) => {
        if (!userId) {
            console.warn('[Sync] Insert skipped: No User ID');
            return;
        }
        console.log('[Sync] Insert:', todo.id, todo.text);
        queueMicrotask(async () => {
            try {
                const { error } = await getSupabase().from('todos').insert({
                    id: todo.id,
                    user_id: userId,
                    content: todo.text,
                    position: todo.position,
                    due_date: todo.due_date,
                    list_id: todo.list_id || listId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                if (error) throw error;
                console.log('[Sync] Insert Success:', todo.id);
            } catch (e) {
                console.error('[Sync] Insert Failed:', e);
            }
        });
    }, [userId, listId]);

    const syncUpdate = useCallback((todo: Todo) => {
        if (!userId) return;
        queueMicrotask(async () => {
            try {
                const { error } = await getSupabase().from('todos').upsert({
                    id: todo.id,
                    user_id: userId,
                    content: todo.text,
                    position: todo.position,
                    due_date: todo.due_date,
                    list_id: todo.list_id || listId,
                    updated_at: new Date().toISOString(),
                });
                if (error) throw error;
                console.log('[Sync] Update Success:', todo.id);
            } catch (e) {
                console.error('[Sync] Update Failed:', e);
            }
        });
    }, [userId, listId]);

    const syncDelete = useCallback((id: string) => {
        if (!userId) return;
        queueMicrotask(async () => {
            try {
                const { error } = await getSupabase().from('todos').delete().eq('id', id);
                if (error) throw error;
                console.log('[Sync] Delete Success:', id);
            } catch (e) {
                console.error('[Sync] Delete Failed:', e);
            }
        });
    }, [userId]);

    const addTodo = (index: number) => {
        const newTodo: Todo = { id: genId(), text: '', position: index, due_date: null, list_id: listId };
        setTodos(prev => {
            const next = [...prev];
            next.splice(index, 0, newTodo);
            return next;
        });
        syncInsert(newTodo);
        return newTodo.id;
    };

    const updateTodo = (id: string, text: string) => {
        // Smart parse date on update
        const { date, hasDate } = smartParse(text);

        setTodos(prev => {
            const next = prev.map(t => {
                if (t.id === id) {
                    const updated = {
                        ...t,
                        text,
                        ...(hasDate ? { due_date: date } : {})
                    };
                    return updated;
                }
                return t;
            });
            const todo = next.find(t => t.id === id);
            if (todo) syncUpdate(todo);
            return next;
        });
    };

    const deleteTodo = (id: string) => {
        setTodos(prev => prev.filter(t => t.id !== id));
        syncDelete(id);
    };

    return { todos, addTodo, updateTodo, deleteTodo };
}
