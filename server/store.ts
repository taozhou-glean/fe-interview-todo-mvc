import { Todo } from '../src/types';

/**
 * Simple in-memory store for the WebSocket server.
 * In a real app this would be a database.
 */
const todos: Record<string, Todo> = {};
const connectedUsers: Set<string> = new Set();

export function addTodo(todo: Todo): void {
  todos[todo.id] = todo;
}

export function updateTodo(id: string, changes: Partial<Todo>): Todo | null {
  if (!todos[id]) return null;
  todos[id] = { ...todos[id], ...changes, updatedAt: Date.now() };
  return todos[id];
}

export function deleteTodo(id: string): boolean {
  if (!todos[id]) return false;
  delete todos[id];
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
