import { writeFileSync } from 'fs';
import { Todo, SubTask } from './src/types';

/**
 * Generates 10,000 todos with subtasks and writes them to localStorage-compatible JSON.
 * Run with: npm run seed
 * Then paste the output into your browser's localStorage under key "todo-mvc-data".
 */

const adjectives = ['Important', 'Urgent', 'Quick', 'Weekly', 'Daily', 'Optional', 'Critical', 'Routine', 'Pending', 'Deferred'];
const verbs = ['Review', 'Update', 'Fix', 'Deploy', 'Test', 'Write', 'Refactor', 'Design', 'Plan', 'Research'];
const nouns = ['dashboard', 'API', 'database', 'auth flow', 'landing page', 'CI pipeline', 'docs', 'tests', 'migration', 'config'];
const subtaskPrefixes = ['Check', 'Verify', 'Draft', 'Outline', 'Implement', 'Sketch'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSubtasks(count: number): SubTask[] {
  const subtasks: SubTask[] = [];
  for (let i = 0; i < count; i++) {
    subtasks.push({
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${pick(subtaskPrefixes)} ${pick(nouns)} step ${i + 1}`,
      completed: Math.random() > 0.6,
    });
  }
  return subtasks;
}

const todos: Record<string, Todo> = {};
const COUNT = 10_000;
const baseTime = Date.now() - COUNT * 60_000; // spread over time

for (let i = 0; i < COUNT; i++) {
  // Use numeric string IDs to trigger the V8 key ordering behavior
  const id = String(i + 1);
  const subtaskCount = Math.random() > 0.7 ? Math.floor(Math.random() * 4) + 1 : 0;

  todos[id] = {
    id,
    title: `${pick(adjectives)}: ${pick(verbs)} ${pick(nouns)} #${i + 1}`,
    completed: Math.random() > 0.65,
    createdAt: baseTime + i * 60_000,
    updatedAt: baseTime + i * 60_000 + Math.floor(Math.random() * 30_000),
    subtasks: generateSubtasks(subtaskCount),
  };
}

const output = JSON.stringify(todos);
writeFileSync('seed-data.json', output);

console.log(`Generated ${COUNT} todos (${Object.values(todos).filter(t => t.subtasks.length > 0).length} with subtasks)`);
console.log(`File written to seed-data.json (${(output.length / 1024 / 1024).toFixed(1)} MB)`);
console.log();
console.log('To load in browser:');
console.log('1. Open the app in your browser');
console.log('2. Open DevTools console');
console.log('3. Run: localStorage.setItem("todo-mvc-data", await fetch("/seed-data.json").then(r => r.text()))');
console.log('4. Refresh the page');
