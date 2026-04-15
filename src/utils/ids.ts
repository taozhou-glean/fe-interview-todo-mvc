export function generateSubTaskId(): string {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
