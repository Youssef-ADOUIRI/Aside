/**
 * Todo item type definition
 */
export interface Todo {
    id: string;
    content: string;
    isCompleted: boolean;
    dueDate: string | null;
    position: number;
    createdAt: string;
    updatedAt: string;
}

/**
 * Parsed date metadata from NLP
 */
export interface ParsedDateInfo {
    originalText: string;
    parsedDate: Date | null;
    confidence: number;
}
