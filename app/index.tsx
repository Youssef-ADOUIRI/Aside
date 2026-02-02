import React, { useCallback } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { observer } from '@legendapp/state/react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { todosStore$ } from '../src/store/todosStore';
import { TodoRow } from '../src/components/TodoRow';
import type { Todo } from '../src/types';

/**
 * Main screen - Minimalist notepad-style todo list
 * "Invisible UI" - no loading screens, no save buttons
 */
export default observer(function IndexScreen() {
  const todos = todosStore$.todos.get();

  // Render each todo item
  const renderItem = useCallback(
    ({ item, index }: { item: Todo; index: number }) => (
      <TodoRow todo={item} index={index} />
    ),
    []
  );

  // Key extractor for FlashList
  const keyExtractor = useCallback((item: Todo) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="auto" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.listContainer}>
          <FlashList
            data={todos}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            estimatedItemSize={44}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 100, // Extra space for keyboard
  },
});
