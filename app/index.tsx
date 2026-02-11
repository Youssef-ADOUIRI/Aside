import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Pressable,
  FlatList,
  Text,
  ScrollView,
  Dimensions,
  Modal,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData
} from 'react-native';
import { useTodos, type Todo } from '../hooks/useTodos';
import { useLists } from '../hooks/useLists';
import { useSession } from './ctx';
import { getSupabase } from '../src/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- ListPage Component ---
function ListPage({ listId, onSlashCommand }: { listId: string; onSlashCommand: (cmd: string, arg: string) => void }) {
  const { todos, addTodo, updateTodo, deleteTodo } = useTodos(listId);
  const inputRefs = useRef<Map<string, TextInput>>(new Map());

  const focusInput = (id: string, delay = 10) => {
    setTimeout(() => {
      const input = inputRefs.current.get(id);
      input?.focus();
    }, delay);
  };

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

  const handleTextChange = (id: string, text: string) => {
    const cmd = text.trim().toLowerCase();

    if (cmd === '/logout' || cmd === '/exit') {
      getSupabase().auth.signOut();
      return;
    }

    if (cmd.startsWith('/new ')) {
      const name = text.trim().substring(5).trim();
      if (name) {
        updateTodo(id, '');
        onSlashCommand('new', name);
        return;
      }
    }
    if (cmd.startsWith('/rename ')) {
      const name = text.trim().substring(8).trim();
      if (name) {
        updateTodo(id, '');
        onSlashCommand('rename', name);
        return;
      }
    }
    if (cmd === '/delete') {
      updateTodo(id, '');
      onSlashCommand('delete', '');
      return;
    }

    updateTodo(id, text);
  };

  const renderItem = useCallback(({ item, index }: { item: Todo; index: number }) => {
    return (
      <View style={styles.row}>
        <TextInput
          ref={(ref) => {
            if (ref) inputRefs.current.set(item.id, ref);
            else inputRefs.current.delete(item.id);
          }}
          style={[styles.input, item.due_date ? styles.inputWithDate : {}]}
          value={item.text}
          onChangeText={(text) => handleTextChange(item.id, text)}
          onSubmitEditing={() => handleEnter(index)}
          blurOnSubmit={false}
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
        {item.due_date && (
          <Text style={styles.dateIndicator}>
            {new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        )}
      </View>
    );
  }, [todos, updateTodo]);

  return (
    <View style={styles.pageContainer}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS !== 'web'}
      >
        <FlatList
          data={todos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={false}
          ListFooterComponent={
            <Pressable style={styles.footerTapArea} onPress={handleTapEmpty} />
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

// --- List Drawer (overlay) ---
function ListDrawer({ 
  visible, 
  lists, 
  activeListId, 
  onSelect, 
  onAdd, 
  onClose 
}: { 
  visible: boolean;
  lists: { id: string; name: string }[];
  activeListId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.drawerBackdrop} onPress={onClose}>
        <View style={styles.drawerContainer}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.drawer}>
              {/* List items */}
              {lists.map((list) => (
                <Pressable 
                  key={list.id} 
                  style={styles.drawerItem}
                  onPress={() => { onSelect(list.id); onClose(); }}
                >
                  <Text style={[
                    styles.drawerItemText,
                    list.id === activeListId && styles.drawerItemActive,
                  ]}>
                    {list.name || 'Untitled'}
                  </Text>
                </Pressable>
              ))}

              {/* Separator */}
              <View style={styles.drawerSep} />

              {/* Add new list */}
              <Pressable style={styles.drawerItem} onPress={onAdd}>
                <Text style={styles.drawerAddText}>+ new list</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// --- Main Screen ---
export default function IndexScreen() {
  const { session } = useSession();
  const {
    lists,
    activeListId,
    setActiveListId,
    addList,
    renameList,
    deleteList,
    isReady,
  } = useLists();

  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(SCREEN_WIDTH);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const newListInputRef = useRef<TextInput>(null);

  const activeIndex = useMemo(
    () => lists.findIndex((l) => l.id === activeListId),
    [lists, activeListId]
  );

  // Scroll to active list when it changes
  useEffect(() => {
    if (activeIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: activeIndex * pageWidth, animated: true });
    }
  }, [activeIndex, pageWidth]);

  // Arrow key navigation (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only navigate when no text input is focused
      const active = document.activeElement;
      const isInputFocused = active && (
        active.tagName === 'INPUT' || 
        active.tagName === 'TEXTAREA' || 
        (active as any).contentEditable === 'true'
      );
      if (isInputFocused) return;

      if (e.key === 'ArrowLeft' && activeIndex > 0) {
        e.preventDefault();
        setActiveListId(lists[activeIndex - 1].id);
      } else if (e.key === 'ArrowRight' && activeIndex < lists.length - 1) {
        e.preventDefault();
        setActiveListId(lists[activeIndex + 1].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, lists, setActiveListId]);

  const handleScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / pageWidth);
    if (newIndex >= 0 && newIndex < lists.length) {
      setActiveListId(lists[newIndex].id);
    }
  };

  const handleSlashCommand = useCallback((cmd: string, arg: string) => {
    if (cmd === 'new') {
      addList(arg);
    } else if (cmd === 'rename' && activeListId) {
      renameList(activeListId, arg);
    } else if (cmd === 'delete' && activeListId) {
      deleteList(activeListId);
    }
  }, [activeListId, addList, renameList, deleteList]);

  const handleAddFromDrawer = () => {
    setShowNewListInput(true);
    setTimeout(() => newListInputRef.current?.focus(), 100);
  };

  const handleNewListSubmit = () => {
    const name = newListName.trim();
    if (name) {
      addList(name);
      setNewListName('');
      setShowNewListInput(false);
      setDrawerVisible(false);
    }
  };

  const onLayout = (e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setPageWidth(w);
  };

  if (!isReady) return <View style={styles.container} />;

  if (lists.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#999', fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Header */}
      <View style={styles.header}>
        {/* List name (tappable to open drawer) */}
        <Pressable onPress={() => setDrawerVisible(true)} hitSlop={12}>
          <Text style={styles.headerListName} numberOfLines={1}>
            {activeList?.name || ''}
            <Text style={styles.headerChevron}> ▾</Text>
          </Text>
        </Pressable>

        {session?.user?.email && (
          <Text style={styles.headerEmail} numberOfLines={1}>
            {session.user.email}
          </Text>
        )}
      </View>

      {/* Horizontal paging */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        style={Platform.OS === 'web'
          ? [styles.scrollView, { scrollSnapType: 'x mandatory' } as any]
          : styles.scrollView
        }
      >
        {lists.map((list) => (
          <View
            key={list.id}
            style={[
              styles.page,
              { width: pageWidth },
              Platform.OS === 'web' ? { scrollSnapAlign: 'start' } as any : {},
            ]}
          >
            <ListPage listId={list.id} onSlashCommand={handleSlashCommand} />
          </View>
        ))}
      </ScrollView>

      {/* Page dots */}
      {lists.length > 1 && (
        <View style={styles.dotsContainer}>
          {lists.map((list, i) => (
            <Pressable
              key={list.id}
              onPress={() => setActiveListId(list.id)}
              hitSlop={8}
            >
              <View
                style={[
                  styles.dot,
                  i === activeIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      )}

      {/* List Drawer */}
      <ListDrawer
        visible={drawerVisible}
        lists={lists}
        activeListId={activeListId}
        onSelect={(id) => setActiveListId(id)}
        onAdd={handleAddFromDrawer}
        onClose={() => { setDrawerVisible(false); setShowNewListInput(false); }}
      />

      {/* New List Input (appears inside drawer via modal) */}
      {drawerVisible && showNewListInput && (
        <Modal transparent animationType="none" visible>
          <Pressable 
            style={styles.drawerBackdrop} 
            onPress={() => { setShowNewListInput(false); setDrawerVisible(false); }}
          >
            <View style={styles.drawerContainer}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={styles.drawer}>
                  {lists.map((list) => (
                    <Pressable 
                      key={list.id} 
                      style={styles.drawerItem}
                      onPress={() => { setActiveListId(list.id); setDrawerVisible(false); setShowNewListInput(false); }}
                    >
                      <Text style={[
                        styles.drawerItemText,
                        list.id === activeListId && styles.drawerItemActive,
                      ]}>
                        {list.name || 'Untitled'}
                      </Text>
                    </Pressable>
                  ))}
                  <View style={styles.drawerSep} />
                  <View style={styles.drawerItem}>
                    <TextInput
                      ref={newListInputRef}
                      style={styles.drawerNewInput}
                      placeholder="List name..."
                      placeholderTextColor="#BBB"
                      value={newListName}
                      onChangeText={setNewListName}
                      onSubmitEditing={handleNewListSubmit}
                      autoFocus
                      {...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {})}
                    />
                  </View>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    ...Platform.select({
      web: { height: '100vh', overflow: 'hidden' },
    }),
  } as any,
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
    ...Platform.select({
      web: { paddingTop: 20 },
      default: { paddingTop: 50 },
    }),
  },
  headerListName: {
    fontSize: 12,
    color: '#BBB',
    maxWidth: 200,
  },
  headerChevron: {
    fontSize: 10,
    color: '#CCC',
  },
  headerEmail: {
    fontSize: 12,
    color: '#CCC',
  },
  scrollView: {
    flex: 1,
  },
  page: {
    flex: 1,
    height: '100%',
  } as any,
  pageContainer: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  list: {
    flex: 1,
    ...Platform.select({
      web: { height: '100%' },
    }),
  } as any,
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    flexGrow: 1,
  },
  row: {
    marginBottom: 0,
    width: '100%',
  },
  input: {
    width: '100%',
    fontSize: 18,
    lineHeight: 28,
    color: '#000000',
    paddingVertical: 0,
    minHeight: 28,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }),
  } as any,
  footerTapArea: {
    height: 400,
    width: '100%',
  },
  inputWithDate: {
    paddingRight: 60,
  },
  dateIndicator: {
    position: 'absolute',
    right: 0,
    top: 14,
    fontSize: 12,
    color: '#FF5555',
    opacity: 0.7,
  },
  // Page dots
  dotsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  dot: {
    borderRadius: 50,
  },
  dotActive: {
    width: 8,
    height: 8,
    backgroundColor: '#999',
  },
  dotInactive: {
    width: 6,
    height: 6,
    backgroundColor: '#DDD',
  },
  // Drawer
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  drawerContainer: {
    marginTop: Platform.OS === 'web' ? 45 : 75,
    marginLeft: 16,
  },
  drawer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  drawerItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  drawerItemText: {
    fontSize: 15,
    color: '#333',
  },
  drawerItemActive: {
    color: '#000',
    fontWeight: '600',
  },
  drawerSep: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 12,
    marginVertical: 4,
  },
  drawerAddText: {
    fontSize: 14,
    color: '#999',
  },
  drawerNewInput: {
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
    minHeight: 24,
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  } as any,
});
