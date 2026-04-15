import { readFileSync, writeFileSync } from 'fs';
import { Todo } from '../src/types';

const DATA_FILE = 'server-data.json';

let todos: Record<string, Todo> = {};
const connectedUsers: Set<string> = new Set();

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
  connectedUsers.add(userId);
  return Array.from(connectedUsers);
}

export function removeUser(userId: string): string[] {
  connectedUsers.delete(userId);
  return Array.from(connectedUsers);
}

export function getUsers(): string[] {
  return Array.from(connectedUsers);
}
