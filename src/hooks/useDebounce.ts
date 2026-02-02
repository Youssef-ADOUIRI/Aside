import { useCallback, useRef } from 'react';

/**
 * Creates a debounced version of a callback
 * Useful for debouncing database writes on text change
 *
 * @param callback The function to debounce
 * @param delay Debounce delay in milliseconds
 */
export function useDebounce<T extends (...args: unknown[]) => void>(
    callback: T,
    delay: number
): T {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedCallback = useCallback(
        (...args: Parameters<T>) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                callback(...args);
            }, delay);
        },
        [callback, delay]
    ) as T;

    return debouncedCallback;
}
