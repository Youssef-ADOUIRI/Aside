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
import { useTheme, type ThemeColors } from '../hooks/useTheme';
import { useSession } from './ctx';
import { getSupabase } from '../src/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- ListPage Component ---
function ListPage({ listId, onSlashCommand, colors }: { listId: string; onSlashCommand: (cmd: string, arg: string) => void; colors: ThemeColors }) {
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
    updateTodo(id, text);
  };

  // Slash commands only fire on Enter (submit)
  const handleSubmit = (id: string, text: string, index: number) => {
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

    // Normal Enter → new line
    handleEnter(index);
  };

  const renderItem = useCallback(({ item, index }: { item: Todo; index: number }) => {
    return (
      <View style={styles.row}>
        <TextInput
          ref={(ref) => {
            if (ref) inputRefs.current.set(item.id, ref);
            else inputRefs.current.delete(item.id);
          }}
          style={[styles.input, { color: colors.text }, (item.due_date || item.text) ? styles.inputWithActions : {}]}
          value={item.text}
          onChangeText={(text) => handleTextChange(item.id, text)}
          onSubmitEditing={() => handleSubmit(item.id, item.text, index)}
          blurOnSubmit={false}
          onKeyPress={(e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
            if (e.nativeEvent.key === 'Backspace') {
              handleBackspace(item.id, item.text, index);
            }
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
              e.preventDefault();
              handleSubmit(item.id, item.text, index);
            }
          }}
          placeholder="Start writing..." 
          placeholderTextColor={colors.placeholder} 
          multiline={true}
          scrollEnabled={false} 
          autoCapitalize="sentences"
        />
        {item.due_date && (
          <Text style={[styles.dateIndicator, { color: colors.accent }]}>
            {new Date(item.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </Text>
        )}
        {item.text.length > 0 && (
          <Pressable
            style={styles.deleteBtn}
            onPress={() => deleteTodo(item.id)}
            hitSlop={6}
          >
            <Text style={[styles.deleteBtnText, { color: colors.textFaint }]}>×</Text>
          </Pressable>
        )}
      </View>
    );
  }, [todos, updateTodo, colors]);

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
  onClose,
  colors 
}: { 
  visible: boolean;
  lists: { id: string; name: string }[];
  activeListId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onClose: () => void;
  colors: ThemeColors;
}) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={[styles.drawerBackdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <View style={styles.drawerContainer}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.drawer, { backgroundColor: colors.card }]}>
              {lists.map((list) => (
                <Pressable 
                  key={list.id} 
                  style={styles.drawerItem}
                  onPress={() => { onSelect(list.id); onClose(); }}
                >
                  <Text style={[
                    styles.drawerItemText,
                    { color: colors.textMuted },
                    list.id === activeListId && { color: colors.text, fontWeight: '600' as any },
                  ]}>
                    {list.name || 'Untitled'}
                  </Text>
                </Pressable>
              ))}
              <View style={[styles.drawerSep, { backgroundColor: colors.separator }]} />
              <Pressable style={styles.drawerItem} onPress={onAdd}>
                <Text style={[styles.drawerAddText, { color: colors.textMuted }]}>+ new list</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// --- Settings Modal ---
function SettingsModal({ visible, onClose, colors, onToggleTheme, themeMode, email }: {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  onToggleTheme: () => void;
  themeMode: string;
  email?: string;
}) {
  if (!visible) return null;
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={[styles.drawerBackdrop, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <View style={styles.settingsContainer}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.drawer, { backgroundColor: colors.card, minWidth: 220 }]}>
              {email && (
                <View style={styles.drawerItem}>
                  <Text style={{ fontSize: 12, color: colors.textFaint }}>{email}</Text>
                </View>
              )}
              <View style={[styles.drawerSep, { backgroundColor: colors.separator }]} />
              <Pressable style={styles.drawerItem} onPress={onToggleTheme}>
                <Text style={[styles.drawerItemText, { color: colors.text }]}>
                  {themeMode === 'dark' ? '☀ Light mode' : '◑ Dark mode'}
                </Text>
              </Pressable>
              <View style={[styles.drawerSep, { backgroundColor: colors.separator }]} />
              <Pressable style={styles.drawerItem} onPress={() => { onClose(); getSupabase().auth.signOut(); }}>
                <Text style={[styles.drawerItemText, { color: colors.accent }]}>Logout</Text>
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
  const { mode: themeMode, toggle: toggleTheme, colors } = useTheme();
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
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const newListInputRef = useRef<TextInput>(null);

  const activeIndex = useMemo(
    () => lists.findIndex((l) => l.id === activeListId),
    [lists, activeListId]
  );

  // Direct scroll — only called from programmatic triggers (keyboard, drawer)
  const scrollToPage = (index: number) => {
    if (scrollRef.current && index >= 0 && index < lists.length) {
      scrollRef.current.scrollTo({ x: index * pageWidth, animated: true });
      setActiveListId(lists[index].id);
    }
  };

  // Ctrl+Shift+Arrow navigation (web only — works even in inputs)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return;

      if (e.key === 'ArrowLeft' && activeIndex > 0) {
        e.preventDefault();
        scrollToPage(activeIndex - 1);
      } else if (e.key === 'ArrowRight' && activeIndex < lists.length - 1) {
        e.preventDefault();
        scrollToPage(activeIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, lists, pageWidth]);

  const handleScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / pageWidth);
    if (newIndex >= 0 && newIndex < lists.length) {
      setActiveListId(lists[newIndex].id);
    }
  };

  // Live header name update while swiping (no scrollTo — just state)
  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / pageWidth);
    if (newIndex >= 0 && newIndex < lists.length && lists[newIndex].id !== activeListId) {
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

  if (!isReady) return <View style={[styles.container, { backgroundColor: colors.bg }]} />;

  if (lists.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.textMuted, fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]} onLayout={onLayout}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setDrawerVisible(true)} hitSlop={12}>
          <Text style={[styles.headerListName, { color: colors.textFaint }]} numberOfLines={1}>
            {activeList?.name || ''}
            <Text style={{ fontSize: 10, color: colors.textFaint }}> ▾</Text>
          </Text>
        </Pressable>

        <View style={styles.headerRight}>
          <Pressable onPress={() => setSettingsVisible(true)} hitSlop={12}>
            <Text style={[styles.headerGear, { color: colors.textFaint }]}>⚙</Text>
          </Pressable>
          {session?.user?.email && (
            <Text style={[styles.headerEmail, { color: colors.textFaint }]} numberOfLines={1}>
              {session.user.email}
            </Text>
          )}
        </View>
      </View>

      {/* Horizontal paging */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        onScroll={handleScroll}
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
            <ListPage listId={list.id} onSlashCommand={handleSlashCommand} colors={colors} />
          </View>
        ))}
      </ScrollView>

      {/* Page dots */}
      {lists.length > 1 && (
        <View style={styles.dotsContainer}>
          {lists.map((list, i) => (
            <Pressable
              key={list.id}
              onPress={() => scrollToPage(i)}
              hitSlop={8}
            >
              <View
                style={[
                  styles.dot,
                  i === activeIndex
                    ? [styles.dotActive, { backgroundColor: colors.dotActive }]
                    : [styles.dotInactive, { backgroundColor: colors.dotInactive }],
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
        onSelect={(id) => {
          const idx = lists.findIndex(l => l.id === id);
          scrollToPage(idx);
        }}
        onAdd={handleAddFromDrawer}
        onClose={() => { setDrawerVisible(false); setShowNewListInput(false); }}
        colors={colors}
      />

      {/* Settings */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        colors={colors}
        onToggleTheme={toggleTheme}
        themeMode={themeMode}
        email={session?.user?.email}
      />

      {/* New List Input (appears inside drawer via modal) */}
      {drawerVisible && showNewListInput && (
        <Modal transparent animationType="none" visible>
          <Pressable 
            style={[styles.drawerBackdrop, { backgroundColor: colors.overlay }]} 
            onPress={() => { setShowNewListInput(false); setDrawerVisible(false); }}
          >
            <View style={styles.drawerContainer}>
              <Pressable onPress={(e) => e.stopPropagation()}>
                <View style={[styles.drawer, { backgroundColor: colors.card }]}>
                  {lists.map((list) => (
                    <Pressable 
                      key={list.id} 
                      style={styles.drawerItem}
                      onPress={() => { setActiveListId(list.id); setDrawerVisible(false); setShowNewListInput(false); }}
                    >
                      <Text style={[
                        styles.drawerItemText,
                        { color: colors.textMuted },
                        list.id === activeListId && { color: colors.text, fontWeight: '600' as any },
                      ]}>
                        {list.name || 'Untitled'}
                      </Text>
                    </Pressable>
                  ))}
                  <View style={[styles.drawerSep, { backgroundColor: colors.separator }]} />
                  <View style={styles.drawerItem}>
                    <TextInput
                      ref={newListInputRef}
                      style={[styles.drawerNewInput, { color: colors.text }]}
                      placeholder="List name..."
                      placeholderTextColor={colors.placeholder}
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

// --- Styles (layout only, colors applied inline via theme) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    maxWidth: 200,
  },
  headerEmail: {
    fontSize: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerGear: {
    fontSize: 14,
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
    fontSize: 16,
    lineHeight: 18,
    paddingVertical: 1,
    minHeight: 18,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    }),
  } as any,
  footerTapArea: {
    height: 400,
    width: '100%',
  },
  inputWithActions: {
    paddingRight: 40,
  },
  deleteBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 20,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  } as any,
  deleteBtnText: {
    fontSize: 14,
    lineHeight: 18,
  },
  dateIndicator: {
    position: 'absolute',
    right: 0,
    top: 4,
    fontSize: 12,
    opacity: 0.7,
  },
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
  },
  dotInactive: {
    width: 6,
    height: 6,
  },
  drawerBackdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  drawerContainer: {
    marginTop: Platform.OS === 'web' ? 45 : 75,
    marginLeft: 16,
  },
  settingsContainer: {
    marginTop: Platform.OS === 'web' ? 45 : 75,
    marginRight: 16,
    alignSelf: 'flex-end',
  },
  drawer: {
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
  },
  drawerSep: {
    height: 1,
    marginHorizontal: 12,
    marginVertical: 4,
  },
  drawerAddText: {
    fontSize: 14,
  },
  drawerNewInput: {
    fontSize: 15,
    paddingVertical: 0,
    minHeight: 24,
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  } as any,
});
