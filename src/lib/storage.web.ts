/**
 * Web Implementation of Storage
 * Uses browser localStorage.
 */
console.log('[Debug] storage.web.ts: Loading Web storage adapter');

export const adapter = {
    getItem: (key: string): string | null => {
        if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(key);
        }
        return null;
    },
    setItem: (key: string, value: string): void => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
        }
    },
    removeItem: (key: string): void => {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
        }
    },
};
