import React, { useCallback, useRef, useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Pressable,
  FlatList,
  Text,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData
} from 'react-native';
import { useTodos, type Todo } from '../hooks/useTodos';
import { useSession } from './ctx';
import { getSupabase } from '../src/lib/supabase';

export default function IndexScreen() {
  const { todos, addTodo, updateTodo, deleteTodo } = useTodos();
  const { session } = useSession(); // Access session
  const listRef = useRef<FlatList>(null);
  const inputRefs = useRef<Map<string, TextInput>>(new Map());

  // Focus helper
  const focusInput = (id: string, delay = 10) => {
    // We need to wait for render
    setTimeout(() => {
      const input = inputRefs.current.get(id);
      input?.focus();
    }, delay);
  };

  // --- Logic ---

  const handleEnter = (index: number) => {
    const newId = addTodo(index + 1);
    focusInput(newId, 50);
  };

  const handleBackspace = (id: string, text: string, index: number) => {
    if (text === '' && todos.length > 1) {
       const prevIndex = index - 1;
       if (prevIndex >= 0) {
         const prevId = todos[prevIndex].id;
         focusInput(prevId);
         deleteTodo(id);
       }
    }
  };

  const handleTapEmpty = () => {
    if (todos.length === 0) {
      focusInput(addTodo(0));
    } else {
      const last = todos[todos.length - 1];
      if (last.text.trim() === '') focusInput(last.id);
      else focusInput(addTodo(todos.length));
    }
  };

  // --- Render ---

  const renderItem = useCallback(({ item, index }: { item: Todo; index: number }) => {
    return (
      <View style={styles.row}>
        {/* Input */}
        <TextInput
          ref={(ref) => {
            if (ref) inputRefs.current.set(item.id, ref);
            else inputRefs.current.delete(item.id);
          }}
          style={[styles.input, item.due_date ? styles.inputWithDate : {}]}
          value={item.text}
          onChangeText={(text) => {
            const cmd = text.trim().toLowerCase();
            if (cmd === '/logout' || cmd === '/exit') {
              getSupabase().auth.signOut();
              return;
            }
            updateTodo(item.id, text);
          }}
          
          // Enter -> New Line (intercept onSubmitEditing)
          onSubmitEditing={() => handleEnter(index)}
          blurOnSubmit={false}
          
          // Backspace -> Delete
          onKeyPress={(e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
            if (e.nativeEvent.key === 'Backspace') {
               handleBackspace(item.id, item.text, index);
            }
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
               e.preventDefault();
               handleEnter(index);
            }
          }}
          
          placeholder="Start writing..." 
          placeholderTextColor="#A0A0A0" 
          multiline={true}
          scrollEnabled={false} 
          autoCapitalize="sentences"
        />
        
        {/* Deadline Indicator */}
        {item.due_date && (
            <Text style={styles.dateIndicator}>
                {new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </Text>
        )}
      </View>
    );
  }, [todos, updateTodo]);

  return (
    <View style={styles.container}>
      {/* Account Header */}
      {session?.user?.email && (
        <Text style={styles.headerEmail} numberOfLines={1}>
          {session.user.email}
        </Text>
      )}

      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS !== 'web'}
      >
        <FlatList
          ref={listRef}
          data={todos} // Revert using real todos
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          
          style={styles.list}
          contentContainerStyle={styles.listContent}
          
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false} // IMPORTANT: Prevents input state loss
          
          ListFooterComponent={
            <Pressable style={styles.footerTapArea} onPress={handleTapEmpty} />
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    ...Platform.select({
      web: {
        height: '100vh',
      },
    }),
  } as any,
  keyboardContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
    ...Platform.select({
      web: {
        height: '100%',
      },
    }),
  } as any,
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    flexGrow: 1, // Ensures footer pushes down
  },
  row: {
    marginBottom: 0,
    width: '100%',
  },
  input: {
    width: '100%',
    fontSize: 18,
    lineHeight: 28,
    color: '#000000', // Explicit black
    paddingVertical: 8,
    minHeight: 44, // Explicit min height
    backgroundColor: 'transparent',
    // Web
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }),
  } as any,
  footerTapArea: {
    height: 400, // Big tap area
    width: '100%',
    // backgroundColor: 'pink' // Uncomment to debug layout
  },
  headerEmail: {
    position: 'absolute',
    top: 50, 
    right: 20,
    fontSize: 12,
    color: '#CCC',
    zIndex: 10,
    ...Platform.select({
      web: { top: 20 }
    })
  },
  inputWithDate: {
    paddingRight: 60, // Space for date
  },
  dateIndicator: {
    position: 'absolute',
    right: 0,
    top: 14, // Vertically center with first line text
    fontSize: 12,
    color: '#FF5555', // Subtle red for deadline
    opacity: 0.7,
  }
});
