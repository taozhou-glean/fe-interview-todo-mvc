import { useState, useEffect, useCallback, useRef } from 'react';
import { Todo, SubTask, FilterMode, AppState, WsMessage } from '../types';
import { saveTodos, loadTodos } from '../storage';
import { send, getUserId } from '../ws';
import { generateTodoId, generateSubTaskId, initIdCounter } from '../utils/ids';
import { getNextOrder, recomputeOrder } from '../utils/ordering';
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
  dragStart: (id: string) => void;
  dragOver: (e: React.DragEvent, targetId: string) => void;
  dragEnd: () => void;
  setFilter: (filter: FilterMode) => void;
  setSearchQuery: (query: string) => void;
  toggleAll: () => void;
  clearCompleted: () => void;
}

/**
 * Core hook managing all todo state and operations.
 * Handles CRUD, filtering, search, drag-and-drop, and persistence.
 */
export function useTodos() {
  const [state, setState] = useState<AppState>(() => {
    const todos = loadTodos();
    initIdCounter(Object.keys(todos));
    return {
      todos,
      filter: 'all' as FilterMode,
      searchQuery: '',
      editingId: null,
      editingText: '',
      draggedId: null,
      connectedUsers: [],
    };
  });

  // RED HERRING: This ref stores a snapshot for the drag-drop overlap detector
  // below. It looks unused but is read inside the handleDragOver closure.
  const todosSnapshotRef = useRef(state.todos);
  todosSnapshotRef.current = state.todos;

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

  // --- CRUD ---

  const addTodo = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const id = generateTodoId();
    const now = Date.now();
    const todo: Todo = {
      id,
      title: trimmed,
      completed: false,
      createdAt: now,
      updatedAt: now,
      subtasks: [],
      order: Object.keys(state.todos).length,
    };

    setState((prev) => ({
      ...prev,
      todos: { ...prev.todos, [id]: todo },
    }));

    send({
      type: 'todo:add',
      payload: { todo },
      userId: getUserId(),
      timestamp: now,
    });
  }, [state.todos]);

  const toggleTodo = useCallback((id: string) => {
    setState((prev) => {
      const todo = prev.todos[id];
      if (!todo) return prev;
      const changes = { completed: !todo.completed, updatedAt: Date.now() };
      return {
        ...prev,
        todos: {
          ...prev.todos,
          [id]: { ...prev.todos[id], ...changes },
        },
      };
    });

    // Fire-and-forget sync
    const todo = state.todos[id];
    if (todo) {
      send({
        type: 'todo:update',
        payload: { id, changes: { completed: !todo.completed, updatedAt: Date.now() } },
        userId: getUserId(),
        timestamp: Date.now(),
      });
    }
  }, [state.todos]);

  const deleteTodo = useCallback((id: string) => {
    setState((prev) => {
      const next = { ...prev.todos };
      delete next[id];
      return { ...prev, todos: next };
    });

    send({
      type: 'todo:delete',
      payload: { id },
      userId: getUserId(),
      timestamp: Date.now(),
    });
  }, []);

  // --- Edit mode ---

  const startEdit = useCallback((id: string) => {
    const todo = state.todos[id];
    if (!todo) return;
    setState((prev) => ({
      ...prev,
      editingId: id,
      editingText: todo.title,
    }));
  }, [state.todos]);

  // Track whether we're in the middle of a cancel operation
  const isCancelingRef = useRef(false);

  const saveEdit = useCallback(() => {
    if (isCancelingRef.current) return;

    setState((prev) => {
      if (!prev.editingId) return prev;
      const title = prev.editingText.trim();
      if (!title) {
        // Delete if emptied
        const next = { ...prev.todos };
        delete next[prev.editingId];
        return { ...prev, todos: next, editingId: null, editingText: '' };
      }
      const changes = { title, updatedAt: Date.now() };
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
      (e.target as HTMLInputElement).blur();
    }
  }, [saveEdit]);

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

    setState((prev) => {
      const todo = prev.todos[todoId];
      if (!todo) return prev;
      return {
        ...prev,
        todos: {
          ...prev.todos,
          [todoId]: {
            ...todo,
            subtasks: [...todo.subtasks, subtask],
            updatedAt: Date.now(),
          },
        },
      };
    });

    send({
      type: 'todo:update',
      payload: {
        id: todoId,
        changes: { subtasks: [...(state.todos[todoId]?.subtasks || []), subtask] },
      },
      userId: getUserId(),
      timestamp: Date.now(),
    });
  }, [state.todos]);

  const toggleSubtask = useCallback((todoId: string, subtaskId: string) => {
    setState((prev) => {
      const todo = prev.todos[todoId];
      if (!todo) return prev;
      const subtasks = todo.subtasks.map((st) =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      );
      return {
        ...prev,
        todos: {
          ...prev.todos,
          [todoId]: { ...todo, subtasks, updatedAt: Date.now() },
        },
      };
    });
  }, []);

  const deleteSubtask = useCallback((todoId: string, subtaskId: string) => {
    setState((prev) => {
      const todo = prev.todos[todoId];
      if (!todo) return prev;
      const subtasks = todo.subtasks.filter((st) => st.id !== subtaskId);
      return {
        ...prev,
        todos: {
          ...prev.todos,
          [todoId]: { ...todo, subtasks, updatedAt: Date.now() },
        },
      };
    });
  }, []);

  // --- Drag and Drop ---

  const getFilteredList = useCallback((): Todo[] => {
    let todos = Object.values(state.todos);
    todos.sort((a, b) => a.order - b.order);

    if (state.filter === 'active') {
      todos = todos.filter((t) => !t.completed);
    } else if (state.filter === 'completed') {
      todos = todos.filter((t) => t.completed);
    }

    if (state.searchQuery) {
      todos = searchTodos(todos, state.searchQuery, state.todos);
    }

    return todos;
  }, [state]);

  const dragStart = useCallback((id: string) => {
    setState((prev) => ({ ...prev, draggedId: id }));
  }, []);

  const dragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!state.draggedId || state.draggedId === targetId) return;

    const todos = getFilteredList();
    const draggedIdx = todos.findIndex((t) => t.id === state.draggedId);
    const targetIdx = todos.findIndex((t) => t.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const reordered = [...todos];
    const [dragged] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, dragged);

    const updatedTodos = recomputeOrder(reordered, state.todos);
    setState((prev) => ({ ...prev, todos: updatedTodos }));
  }, [state.draggedId, state.todos, getFilteredList]);

  const dragEnd = useCallback(() => {
    if (state.draggedId) {
      send({
        type: 'todo:reorder',
        payload: { orderedIds: getFilteredList().map((t) => t.id) },
        userId: getUserId(),
        timestamp: Date.now(),
      });
    }
    setState((prev) => ({ ...prev, draggedId: null }));
  }, [state.draggedId, getFilteredList]);

  // --- Filters ---

  const setFilter = useCallback((filter: FilterMode) => {
    setState((prev) => ({ ...prev, filter }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  // --- Bulk ---

  const toggleAll = useCallback(() => {
    setState((prev) => {
      const allCompleted = Object.values(prev.todos).every((t) => t.completed);
      const updatedTodos: Record<string, Todo> = {};
      for (const [id, todo] of Object.entries(prev.todos)) {
        updatedTodos[id] = { ...todo, completed: !allCompleted, updatedAt: Date.now() };
      }
      return { ...prev, todos: updatedTodos };
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setState((prev) => {
      const updatedTodos: Record<string, Todo> = {};
      for (const [id, todo] of Object.entries(prev.todos)) {
        if (!todo.completed) {
          updatedTodos[id] = todo;
        }
      }
      return { ...prev, todos: updatedTodos };
    });
  }, []);

  // --- WS state updates (called from useWebSocket) ---

  const applyWsUpdate = useCallback((updater: (prev: AppState) => AppState) => {
    setState(updater);
  }, []);

  const actions: TodoActions = {
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
    dragStart,
    dragOver,
    dragEnd,
    setFilter,
    setSearchQuery,
    toggleAll,
    clearCompleted,
  };

  return {
    state,
    actions,
    filteredTodos: getFilteredList(),
    editInputRef,
    applyWsUpdate,
    // RED HERRING: exported for potential future use in drag collision detection
    todosSnapshotRef,
  };
}
