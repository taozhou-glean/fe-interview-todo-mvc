import { readFileSync, writeFileSync } from 'fs';
import { Todo } from '../src/types';

const DATA_FILE = 'server-data.json';

let todos: Record<string, Todo> = {};
// Reference-counted presence: same userId from multiple tabs counts as one user,
// but only removed when ALL connections for that userId disconnect.
const connectedUsers: Map<string, number> = new Map();

// Load persisted data on startup
try {
  const raw = readFileSync(DATA_FILE, 'utf-8');
  todos = JSON.parse(raw);
  console.log(`[Store] Loaded ${Object.keys(todos).length} todos from ${DATA_FILE}`);
} catch {
  // No file yet or invalid JSON — start fresh
}

function persist(): void {
  try {
    writeFileSync(DATA_FILE, JSON.stringify(todos));
  } catch (e) {
    console.warn('[Store] Failed to persist:', e);
  }
}

export function addTodo(todo: Todo): void {
  todos[todo.id] = todo;
  persist();
}

export function updateTodo(id: string, changes: Partial<Todo>): Todo | null {
  if (!todos[id]) return null;
  todos[id] = { ...todos[id], ...changes, updatedAt: Date.now() };
  persist();
  return todos[id];
}

export function deleteTodo(id: string): boolean {
  if (!todos[id]) return false;
  delete todos[id];
  persist();
  return true;
}

export function getAllTodos(): Record<string, Todo> {
  return { ...todos };
}

export function addUser(userId: string): string[] {
  connectedUsers.set(userId, (connectedUsers.get(userId) ?? 0) + 1);
  return Array.from(connectedUsers.keys());
}

export function removeUser(userId: string): string[] {
  const count = connectedUsers.get(userId) ?? 0;
  if (count <= 1) {
    connectedUsers.delete(userId);
  } else {
    connectedUsers.set(userId, count - 1);
  }
  return Array.from(connectedUsers.keys());
}
