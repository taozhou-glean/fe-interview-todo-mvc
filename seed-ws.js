// Run in browser console after `npm run dev` to seed todos via WebSocket.
// Usage: seedTodos()       → 3 hand-crafted sample todos (default for candidates)
//        seedTodos(10000)  → 10K generated todos (for perf testing BUG-2)

function seedTodos(count) {
  const ws = new WebSocket("ws://localhost:8080");
  ws.onopen = () => {
    const userId = "seeder";
    ws.send(JSON.stringify({ type: "user:join", payload: { userId }, userId, timestamp: Date.now() }));

    const todos = count ? generateTodos(count) : handcraftedTodos();

    todos.forEach(todo => {
      ws.send(JSON.stringify({ type: "todo:add", payload: { todo }, userId, timestamp: Date.now() }));
    });

    console.log(`Seeded ${todos.length} todos via WebSocket`);
    ws.close();
  };
}

function handcraftedTodos() {
  const now = Date.now();
  return [
    { id: "seed-1", title: "Buy groceries", completed: false, createdAt: now, updatedAt: now, subtasks: [{ id: "sub-1a", title: "Milk", completed: true }, { id: "sub-1b", title: "Eggs", completed: false }], order: 0 },
    { id: "seed-2", title: "Review PR #42", completed: true, createdAt: now, updatedAt: now, subtasks: [], order: 1 },
    { id: "seed-3", title: "Plan team offsite", completed: false, createdAt: now, updatedAt: now, subtasks: [{ id: "sub-3a", title: "Book venue", completed: false }, { id: "sub-3b", title: "Send invites", completed: false }, { id: "sub-3c", title: "Order catering", completed: false }], order: 2 },
  ];
}

function generateTodos(count) {
  const adj = ["Important", "Urgent", "Quick", "Weekly", "Daily", "Optional", "Critical", "Routine", "Pending", "Deferred"];
  const verbs = ["Review", "Update", "Fix", "Deploy", "Test", "Write", "Refactor", "Design", "Plan", "Research"];
  const nouns = ["dashboard", "API", "database", "auth flow", "landing page", "CI pipeline", "docs", "tests", "migration", "config"];
  const stPrefixes = ["Check", "Verify", "Draft", "Outline", "Implement", "Sketch"];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const todos = [];
  const baseTime = Date.now() - count * 60000;

  for (let i = 0; i < count; i++) {
    const subtaskCount = Math.random() > 0.7 ? Math.floor(Math.random() * 4) + 1 : 0;
    const subtasks = [];
    for (let j = 0; j < subtaskCount; j++) {
      subtasks.push({ id: `sub-${i}-${j}`, title: `${pick(stPrefixes)} ${pick(nouns)} step ${j + 1}`, completed: Math.random() > 0.6 });
    }

    todos.push({
      id: String(i + 1),
      title: `${pick(adj)}: ${pick(verbs)} ${pick(nouns)} #${i + 1}`,
      completed: Math.random() > 0.65,
      createdAt: baseTime + i * 60000,
      updatedAt: baseTime + i * 60000 + Math.floor(Math.random() * 30000),
      subtasks,
      order: Math.random() > 0.1 ? i : Math.floor(Math.random() * count),
    });
  }
  return todos;
}

// Auto-run: paste this whole script, then call seedTodos() or seedTodos(10000)
