import { useCallback, useRef } from 'react';
import * as chrono from 'chrono-node';
import type { ParsedDateInfo } from '../types';

/**
 * Custom hook for silent date parsing using chrono-node
 * Parses natural language dates without showing any UI
 *
 * @example
 * const { parseDate } = useSmartDate();
 * const result = parseDate("Meeting tomorrow at 3pm");
 * // result.parsedDate = Date for tomorrow 3pm
 */
export function useSmartDate() {
    // Cache to avoid re-parsing the same text
    const cacheRef = useRef<Map<string, ParsedDateInfo>>(new Map());

    const parseDate = useCallback((text: string): ParsedDateInfo => {
        // Check cache first
        const cached = cacheRef.current.get(text);
        if (cached) {
            return cached;
        }

        // Parse with chrono-node
        const results = chrono.parse(text);

        let parsedDate: Date | null = null;
        let confidence = 0;

        if (results.length > 0) {
            const firstResult = results[0];
            parsedDate = firstResult.start.date();

            // Calculate confidence based on specificity
            // More specific dates (with time) get higher confidence
            const hasTime = firstResult.start.isCertain('hour');
            const hasDate = firstResult.start.isCertain('day');
            confidence = (hasDate ? 0.5 : 0.3) + (hasTime ? 0.3 : 0) + 0.2;
        }

        const result: ParsedDateInfo = {
            originalText: text,
            parsedDate,
            confidence,
        };

        // Cache result (limit cache size)
        if (cacheRef.current.size > 100) {
            const firstKey = cacheRef.current.keys().next().value;
            if (firstKey) cacheRef.current.delete(firstKey);
        }
        cacheRef.current.set(text, result);

        return result;
    }, []);

    /**
     * Extract ISO date string if a date is found, otherwise null
     */
    const extractDateISO = useCallback(
        (text: string): string | null => {
            const result = parseDate(text);
            return result.parsedDate ? result.parsedDate.toISOString() : null;
        },
        [parseDate]
    );

    return {
        parseDate,
        extractDateISO,
    };
}
