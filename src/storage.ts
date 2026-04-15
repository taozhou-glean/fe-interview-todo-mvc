import { Todo } from './types';

const STORAGE_KEY = 'todo-mvc-data';

/**
 * Persistence layer for todos.
 * Uses a key-value map for O(1) lookups by ID.
 */
export function saveTodos(todos: Record<string, Todo>): void {
  try {
    const data = JSON.stringify(todos);
    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    console.warn('Failed to save todos:', e);
  }
}

export function loadTodos(): Record<string, Todo> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed as Record<string, Todo>;
  } catch (e) {
    console.warn('Failed to load todos:', e);
    return {};
  }
}

export function clearTodos(): void {
  localStorage.removeItem(STORAGE_KEY);
}
