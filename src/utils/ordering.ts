import { Todo } from '../types';

/**
 * Compute the next order value for a new todo.
 * Finds the current maximum order and increments by 1 to place
 * the new item at the end.
 */
export function getNextOrder(todos: Record<string, Todo>): number {
  const values = Object.values(todos);
  if (values.length === 0) return 0;
  return Math.max(...values.map((t) => t.order)) + 1;
}

/**
 * Recompute order values for a reordered list.
 * Assigns sequential integers starting from 0.
 */
export function recomputeOrder(
  orderedTodos: Todo[],
  allTodos: Record<string, Todo>
): Record<string, Todo> {
  const updated = { ...allTodos };
  orderedTodos.forEach((todo, idx) => {
    updated[todo.id] = { ...updated[todo.id], order: idx };
  });
  return updated;
}
