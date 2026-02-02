import React, { useCallback, useRef, useEffect, memo } from 'react';
import {
  TextInput,
  StyleSheet,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
  type TextInputChangeEventData,
} from 'react-native';
import { observer } from '@legendapp/state/react';
import { todosStore$, todoActions } from '../store/todosStore';
import { useSmartDate } from '../hooks/useSmartDate';
import { useDebounce } from '../hooks/useDebounce';
import type { Todo } from '../types';

interface TodoRowProps {
  todo: Todo;
  index: number;
}

/**
 * Individual todo row - a borderless TextInput
 * Implements the "Notepad Logic":
 * - Enter: Create new row below
 * - Backspace (empty): Delete row, focus previous
 * - Text change: Debounced update (100ms)
 */
export const TodoRow = memo(
  observer(function TodoRow({ todo, index }: TodoRowProps) {
    const inputRef = useRef<TextInput>(null);
    const { extractDateISO } = useSmartDate();

    // Get focused state from store
    const focusedId = todosStore$.focusedId.get();
    const shouldFocus = focusedId === todo.id;

    // Focus when this row becomes active
    useEffect(() => {
      if (shouldFocus && inputRef.current) {
        inputRef.current.focus();
      }
    }, [shouldFocus]);

    // Debounced update function (100ms as per spec)
    const debouncedUpdate = useDebounce(
      useCallback(
        (text: string) => {
          todoActions.updateContent(todo.id, text);

          // Silent date parsing - update metadata only
          const dueDate = extractDateISO(text);
          if (dueDate) {
            todoActions.setDueDate(todo.id, dueDate);
          }
        },
        [todo.id, extractDateISO]
      ),
      100
    );

    // Handle text changes
    const handleChange = useCallback(
      (event: NativeSyntheticEvent<TextInputChangeEventData>) => {
        const text = event.nativeEvent.text;
        debouncedUpdate(text);
      },
      [debouncedUpdate]
    );

    // Handle key presses for Enter and Backspace
    const handleKeyPress = useCallback(
      (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
        const key = event.nativeEvent.key;

        if (key === 'Enter') {
          // Prevent default newline
          event.preventDefault?.();
          // Insert new row after this one
          todoActions.insertAfter(todo.id);
        } else if (key === 'Backspace') {
          // Get current content
          const currentContent = todosStore$.todos[index]?.content?.get() ?? '';
          if (currentContent === '') {
            // Delete empty row and focus previous
            todoActions.deleteIfEmpty(todo.id);
          }
        }
      },
      [todo.id, index]
    );

    // Handle focus
    const handleFocus = useCallback(() => {
      todoActions.setFocused(todo.id);
    }, [todo.id]);

    return (
      <TextInput
        ref={inputRef}
        style={styles.input}
        defaultValue={todo.content}
        onChange={handleChange}
        onKeyPress={handleKeyPress}
        onFocus={handleFocus}
        placeholder={index === 0 ? 'Start typing...' : ''}
        placeholderTextColor="#999"
        multiline={false}
        returnKeyType="default"
        blurOnSubmit={false}
        autoCorrect={true}
        autoCapitalize="sentences"
        textAlignVertical="center"
      />
    );
  })
);

const styles = StyleSheet.create({
  input: {
    width: '100%',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    fontFamily: 'System',
    color: '#000',
    backgroundColor: 'transparent',
    // No borders - invisible UI
    borderWidth: 0,
  },
});
