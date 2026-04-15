import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Todo, SubTask, FilterMode, AppState } from '../types';
import { saveTodos, loadTodos } from '../storage';
import { send, getDisplayName } from '../ws';
import { generateSubTaskId } from '../utils/ids';
import { searchTodos } from '../utils/search';

export interface TodoActions {
  addTodo: (title: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  startEdit: (id: string) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  editKeyDown: (e: React.KeyboardEvent) => void;
  setEditingText: (text: string) => void;
  addSubtask: (todoId: string, title: string) => void;
  toggleSubtask: (todoId: string, subtaskId: string) => void;
  deleteSubtask: (todoId: string, subtaskId: string) => void;
  setFilter: (filter: FilterMode) => void;
  setSearchQuery: (query: string) => void;
  toggleAll: () => void;
  clearCompleted: () => void;
}

/**
 * Core hook managing all todo state and operations.
 * Handles CRUD, filtering, search, and persistence.
 */
export function useTodos() {
  const [state, setState] = useState<AppState>(() => {
    const todos = loadTodos();
    return {
      todos,
      filter: 'all' as FilterMode,
      searchQuery: '',
      editingId: null,
      editingText: '',
      connectedUsers: [],
      syncing: true,
    };
  });

  const editInputRef = useRef<HTMLInputElement>(null);

  // Persist todos on change
  useEffect(() => {
    saveTodos(state.todos);
  }, [state.todos]);

  // Focus edit input when editing starts
  useEffect(() => {
    if (state.editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [state.editingId]);

  const addTodo = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const clientId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();
    const todo: Todo = {
      id: clientId,
      title: trimmed,
      completed: false,
      createdAt: now,
      updatedAt: now,
      subtasks: [],
    };

    setState((prev) => ({
      ...prev,
      todos: { ...prev.todos, [clientId]: todo },
    }));

    send({
      type: 'todo:add',
      payload: { todo, clientId },
      userId: getDisplayName(),
      timestamp: now,
    });
  }, []);

  const toggleTodo = useCallback((id: string) => {
    let syncChanges: { completed: boolean; updatedAt: number } | null = null;

    setState((prev) => {
      const todo = prev.todos[id];
      if (!todo) return prev;
      const changes = { completed: !todo.completed, updatedAt: Date.now() };
      syncChanges = changes;
      return {
        ...prev,
        todos: {
          ...prev.todos,
          [id]: { ...prev.todos[id], ...changes },
        },
      };
    });

    if (syncChanges) {
      send({
        type: 'todo:update',
        payload: { id, changes: syncChanges },
        userId: getDisplayName(),
        timestamp: Date.now(),
      });
    }
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev.todos };
      delete next[id];
      return { ...prev, todos: next };
    });

    send({
      type: 'todo:delete',
      payload: { id },
      userId: getDisplayName(),
      timestamp: Date.now(),
    });
  }, []);

  // --- Edit mode ---

  const startEdit = useCallback((id: string) => {
    isCancelingRef.current = false;
    setState((prev) => {
      const todo = prev.todos[id];
      if (!todo) return prev;
      return {
        ...prev,
        editingId: id,
        editingText: todo.title,
      };
    });
  }, []);

  // Track whether we're in the middle of a cancel operation
  const isCancelingRef = useRef(false);

  const saveEdit = useCallback(() => {
    if (isCancelingRef.current) return;

    // Capture what to sync — computed inside setState for fresh state.
    // Uses a container object so TS doesn't narrow the value to `null`.
    type SyncAction = { type: 'update'; id: string; changes: Partial<Todo> } | { type: 'delete'; id: string };
    const pending: { action: SyncAction | null } = { action: null };

    setState((prev) => {
      if (!prev.editingId) return prev;
      const title = prev.editingText.trim();
      if (!title) {
        // Delete if emptied
        pending.action = { type: 'delete', id: prev.editingId };
        const next = { ...prev.todos };
        delete next[prev.editingId];
        return { ...prev, todos: next, editingId: null, editingText: '' };
      }
      const changes = { title, updatedAt: Date.now() };
      pending.action = { type: 'update', id: prev.editingId, changes };
      return {
        ...prev,
        todos: {
          ...prev.todos,
          [prev.editingId]: { ...prev.todos[prev.editingId], ...changes },
        },
        editingId: null,
        editingText: '',
      };
    });

    // Sync after state update — pending.action is set synchronously by setState
    if (pending.action) {
      if (pending.action.type === 'update') {
        send({
          type: 'todo:update',
          payload: { id: pending.action.id, changes: pending.action.changes },
          userId: getDisplayName(),
          timestamp: Date.now(),
        });
      } else {
        send({
          type: 'todo:delete',
          payload: { id: pending.action.id },
          userId: getDisplayName(),
          timestamp: Date.now(),
        });
      }
    }
  }, []);

  const cancelEdit = useCallback(() => {
    isCancelingRef.current = true;
    setState((prev) => ({
      ...prev,
      editingId: null,
      editingText: '',
    }));
  }, []);

  const editKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  const setEditingText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, editingText: text }));
  }, []);

  // --- Subtasks ---

  const addSubtask = useCallback((todoId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const subtask: SubTask = {
      id: generateSubTaskId(),
      title: trimmed,
      completed: false,
    };

    let nextSubtasks: SubTask[] | null = null;

    setState((prev) => {
      const todo = prev.todos[todoId];
      if (!todo) return prev;
      nextSubtasks = [...todo.subtasks, subtask];
      return {
        ...prev,
        todos: {
          ...prev.todos,
          [todoId]: {
            ...todo,
            subtasks: nextSubtasks,
            updatedAt: Date.now(),
          },
        },
      };
    });

    if (nextSubtasks) {
      send({
        type: 'todo:update',
        payload: { id: todoId, changes: { subtasks: nextSubtasks, updatedAt: Date.now() } },
        userId: getDisplayName(),
        timestamp: Date.now(),
      });
    }
  }, []);

  const toggleSubtask = useCallback((todoId: string, subtaskId: string) => {
    let nextSubtasks: SubTask[] | null = null;

    setState((prev) => {
      const todo = prev.todos[todoId];
      if (!todo) return prev;
      nextSubtasks = todo.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      return {
        ...prev,
        todos: {
          ...prev.todos,
          [todoId]: { ...todo, subtasks: nextSubtasks, updatedAt: Date.now() },
        },
      };
    });

    if (nextSubtasks) {
      send({
        type: 'todo:update',
        payload: { id: todoId, changes: { subtasks: nextSubtasks, updatedAt: Date.now() } },
        userId: getDisplayName(),
        timestamp: Date.now(),
      });
    }
  }, []);

  const deleteSubtask = useCallback((todoId: string, subtaskId: string) => {
    let nextSubtasks: SubTask[] | null = null;

    setState((prev) => {
      const todo = prev.todos[todoId];
      if (!todo) return prev;
      nextSubtasks = todo.subtasks.filter((st) => st.id !== subtaskId);
      return {
        ...prev,
        todos: {
          ...prev.todos,
          [todoId]: { ...todo, subtasks: nextSubtasks, updatedAt: Date.now() },
        },
      };
    });

    if (nextSubtasks) {
      send({
        type: 'todo:update',
        payload: { id: todoId, changes: { subtasks: nextSubtasks, updatedAt: Date.now() } },
        userId: getDisplayName(),
        timestamp: Date.now(),
      });
    }
  }, []);

  // --- Filtered list ---

  const filteredTodos = useMemo((): Todo[] => {
    let todos = Object.values(state.todos);
    todos.sort((a, b) => a.createdAt - b.createdAt);

    if (state.filter === 'active') {
      todos = todos.filter((t) => !t.completed);
    } else if (state.filter === 'completed') {
      todos = todos.filter((t) => t.completed);
    }

    if (state.searchQuery) {
      todos = searchTodos(todos, state.searchQuery);
    }

    return todos;
  }, [state.todos, state.filter, state.searchQuery]);

  // --- Filters ---

  const setFilter = useCallback((filter: FilterMode) => {
    setState((prev) => ({ ...prev, filter }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  // --- Bulk ---

  const toggleAll = useCallback(() => {
    const updates: Array<{ id: string; completed: boolean }> = [];

    setState((prev) => {
      const allCompleted = Object.values(prev.todos).every((t) => t.completed);
      const nowCompleted = !allCompleted;
      const updatedTodos: Record<string, Todo> = {};
      const now = Date.now();
      for (const [id, todo] of Object.entries(prev.todos)) {
        updatedTodos[id] = { ...todo, completed: nowCompleted, updatedAt: now };
        updates.push({ id, completed: nowCompleted });
      }
      return { ...prev, todos: updatedTodos };
    });

    // Fan out per-todo updates
    const now = Date.now();
    for (const { id, completed } of updates) {
      send({
        type: 'todo:update',
        payload: { id, changes: { completed, updatedAt: now } },
        userId: getDisplayName(),
        timestamp: now,
      });
    }
  }, []);

  const clearCompleted = useCallback(() => {
    const deletedIds: string[] = [];

    setState((prev) => {
      const updatedTodos: Record<string, Todo> = {};
      for (const [id, todo] of Object.entries(prev.todos)) {
        if (!todo.completed) {
          updatedTodos[id] = todo;
        } else {
          deletedIds.push(id);
        }
      }
      return { ...prev, todos: updatedTodos };
    });

    // Fan out per-todo deletes
    const now = Date.now();
    for (const id of deletedIds) {
      send({
        type: 'todo:delete',
        payload: { id },
        userId: getDisplayName(),
        timestamp: now,
      });
    }
  }, []);

  // --- WS state updates (called from useWebSocket) ---

  const applyWsUpdate = useCallback((updater: (prev: AppState) => AppState) => {
    setState(updater);
  }, []);

  const actions: TodoActions = useMemo(() => ({
    addTodo,
    toggleTodo,
    deleteTodo,
    startEdit,
    saveEdit,
    cancelEdit,
    editKeyDown,
    setEditingText,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    setFilter,
    setSearchQuery,
    toggleAll,
    clearCompleted,
  }), [
    addTodo, toggleTodo, deleteTodo, startEdit, saveEdit, cancelEdit,
    editKeyDown, setEditingText, addSubtask, toggleSubtask, deleteSubtask,
    setFilter, setSearchQuery, toggleAll, clearCompleted,
  ]);

  return {
    state,
    actions,
    filteredTodos,
    editInputRef,
    applyWsUpdate,
  };
}
