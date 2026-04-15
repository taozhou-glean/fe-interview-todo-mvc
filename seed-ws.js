// Run in browser console (or Node) after `npm run dev` to seed initial todos via WebSocket.
// This is what we run before handing the repo to a candidate.
const ws = new WebSocket("ws://localhost:8080");
ws.onopen = () => {
  const userId = "seeder";
  ws.send(JSON.stringify({ type: "user:join", payload: { userId }, userId, timestamp: Date.now() }));
  const todos = [
    { id: "seed-1", title: "Buy groceries", completed: false, createdAt: Date.now(), updatedAt: Date.now(), subtasks: [{ id: "sub-1a", title: "Milk", completed: true }, { id: "sub-1b", title: "Eggs", completed: false }], order: 0 },
    { id: "seed-2", title: "Review PR #42", completed: true, createdAt: Date.now(), updatedAt: Date.now(), subtasks: [], order: 1 },
    { id: "seed-3", title: "Plan team offsite", completed: false, createdAt: Date.now(), updatedAt: Date.now(), subtasks: [{ id: "sub-3a", title: "Book venue", completed: false }, { id: "sub-3b", title: "Send invites", completed: false }, { id: "sub-3c", title: "Order catering", completed: false }], order: 2 },
  ];
  todos.forEach(todo => {
    ws.send(JSON.stringify({ type: "todo:add", payload: { todo }, userId, timestamp: Date.now() }));
  });
  console.log("Seeded 3 todos via WebSocket");
  ws.close();
};
