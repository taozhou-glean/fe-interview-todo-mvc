let counter = 1;

export function initIdCounter(existingIds: string[]): void {
  const numericIds = existingIds.map(Number).filter((n) => !isNaN(n));
  if (numericIds.length > 0) {
    counter = Math.max(...numericIds) + 1;
  }
}

export function generateTodoId(): string {
  return String(counter++);
}

export function generateSubTaskId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
