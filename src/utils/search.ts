import { Todo } from '../types';

interface SearchOptions {
  includeSubtasks?: boolean;
  caseSensitive?: boolean;
}

/**
 * Compute a relevance score for a todo against a search query.
 * Higher score = more relevant. Returns 0 for no match.
 *
 * Scoring: title exact match (10), title partial (5),
 * subtask match (3).
 */
function computeRelevanceScore(
  todo: Todo,
  query: string,
  options: SearchOptions
): number {
  const q = options.caseSensitive ? query : query.toLowerCase();
  const title = options.caseSensitive ? todo.title : todo.title.toLowerCase();
  let score = 0;

  // Title matching
  if (title === q) {
    score += 10;
  } else if (title.includes(q)) {
    score += 5;
  }

  // Subtask matching
  if (options.includeSubtasks !== false) {
    for (const subtask of todo.subtasks) {
      const stTitle = options.caseSensitive
        ? subtask.title
        : subtask.title.toLowerCase();
      if (stTitle.includes(q)) {
        score += 3;
      }
    }
  }

  return score;
}

/**
 * Search and filter todos based on a query string.
 * Returns todos sorted by relevance score (highest first),
 * filtering out todos with score 0.
 */
export function searchTodos(
  todos: Todo[],
  query: string,
  options: SearchOptions = {}
): Todo[] {
  if (!query.trim()) return todos;

  const scored = todos.map((todo) => ({
    todo,
    score: computeRelevanceScore(todo, query.trim(), options),
  }));

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ todo }) => todo);
}
