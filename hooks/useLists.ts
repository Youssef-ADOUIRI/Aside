import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../src/lib/supabase';
import { useSession } from '../app/ctx';

export interface ListItem {
    id: string;
    name: string;
    position: number;
}

const genId = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });

export function useLists() {
    const [lists, setLists] = useState<ListItem[]>([]);
    const [activeListId, setActiveListId] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    const { session } = useSession();
    const userId = session?.user?.id;

    useEffect(() => {
        if (userId) {
            loadLists(userId);
        } else {
            setLists([]);
            setActiveListId(null);
            setIsReady(false);
        }
    }, [userId]);

    const loadLists = async (uid: string) => {
        try {
            const { data, error } = await getSupabase()
                .from('lists')
                .select('*')
                .eq('user_id', uid)
                .order('position', { ascending: true });

            if (error) throw error;

            if (data && data.length > 0) {
                const mapped = data.map((l: any) => ({
                    id: l.id,
                    name: l.name || '',
                    position: l.position ?? 0,
                }));
                setLists(mapped);
                setActiveListId(mapped[0].id);
                await adoptOrphanedTodos(uid, mapped[0].id);
            } else {
                const defaultList = await createDefaultList(uid);
                if (defaultList) {
                    setLists([defaultList]);
                    setActiveListId(defaultList.id);
                    await adoptOrphanedTodos(uid, defaultList.id);
                }
            }
            setIsReady(true);
        } catch (e) {
            console.error('[Lists] Load failed:', e);
            setIsReady(true);
        }
    };

    const createDefaultList = async (uid: string): Promise<ListItem | null> => {
        const id = genId();
        const defaultList: ListItem = { id, name: 'Notes', position: 0 };
        try {
            const { error } = await getSupabase().from('lists').insert({
                id,
                user_id: uid,
                name: 'Notes',
                position: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }).select();
            if (error) throw error;
            return defaultList;
        } catch (e) {
            console.error('[Lists] Default list creation failed:', e);
            return null;
        }
    };

    const adoptOrphanedTodos = async (uid: string, listId: string) => {
        try {
            const { error } = await getSupabase()
                .from('todos')
                .update({ list_id: listId, updated_at: new Date().toISOString() })
                .eq('user_id', uid)
                .is('list_id', null);
            if (error) throw error;
        } catch (e) {
            console.error('[Lists] Adopt orphans failed:', e);
        }
    };

    const addList = useCallback(
        (name: string): string | null => {
            if (!userId) return null;

            const id = genId();
            const position = lists.length;
            const newList: ListItem = { id, name, position };

            setLists((prev) => [...prev, newList]);
            setActiveListId(id);

            queueMicrotask(async () => {
                try {
                    const { error } = await getSupabase().from('lists').insert({
                        id,
                        user_id: userId,
                        name,
                        position,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
                    if (error) throw error;
                } catch (e) {
                    console.error('[Lists] Insert failed:', e);
                }
            });

            return id;
        },
        [userId, lists]
    );

    const renameList = useCallback(
        (id: string, name: string) => {
            if (!userId) return;

            setLists((prev) =>
                prev.map((l) => (l.id === id ? { ...l, name } : l))
            );

            queueMicrotask(async () => {
                try {
                    const { error } = await getSupabase()
                        .from('lists')
                        .update({ name, updated_at: new Date().toISOString() })
                        .eq('id', id);
                    if (error) throw error;
                } catch (e) {
                    console.error('[Lists] Rename failed:', e);
                }
            });
        },
        [userId]
    );

    const deleteList = useCallback(
        (id: string) => {
            if (!userId) return;
            if (lists.length <= 1) return;

            const idx = lists.findIndex((l) => l.id === id);
            const remaining = lists.filter((l) => l.id !== id);
            setLists(remaining);

            if (activeListId === id) {
                const newIdx = Math.min(idx, remaining.length - 1);
                setActiveListId(remaining[newIdx]?.id ?? null);
            }

            queueMicrotask(async () => {
                try {
                    const { error } = await getSupabase()
                        .from('lists')
                        .delete()
                        .eq('id', id);
                    if (error) throw error;
                } catch (e) {
                    console.error('[Lists] Delete failed:', e);
                }
            });
        },
        [userId, lists, activeListId]
    );

    return {
        lists,
        activeListId,
        setActiveListId,
        addList,
        renameList,
        deleteList,
        isReady,
    };
}
