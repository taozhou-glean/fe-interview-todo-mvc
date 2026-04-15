# Frontend Engineering Assignment: Todo MVC — Production Edition

## Context

You're joining a team that shipped a Todo MVC app as an internal tool MVP. The original developer has moved to another team, and you've been asked to take ownership. The app works, but users have reported several issues, and product has some feature requests.

Your job is to **triage, prioritize, and work through the backlog below**. There are intentionally more items than can be done in the time allotted — we want to see how you prioritize.

## Getting Started

```bash
npm install
npm run dev     # starts both the Vite dev server (port 3000) and WebSocket server (port 8080)
```

The app comes pre-seeded with a few sample todos. To test collaborative features, open the app in two browser tabs.

## Time

Spend **up to 8 hours**. Partial completion is completely fine — we evaluate depth over breadth.

## Deliverables

1. **Your code changes** — ideally with separate commits per fix/feature so we can review your thought process
2. **A short write-up** (can be a NOTES.md file) explaining:
   - What you prioritized and why
   - What you would do next with more time
   - Any significant trade-offs you made

---

## The Backlog

### Bug Reports

**BUG-1: Todos randomly reorder after page refresh** (P0)
> "I carefully ordered my todos by dragging them, but after refreshing the page they're in a completely different order. Sometimes they seem fine, sometimes they're shuffled."

**BUG-2: App freezes when typing in search with many todos** (P0)
> "We loaded about 10K todos for a team workspace. When I try to search, the app locks up for 2-3 seconds after every keystroke. It makes the search unusable."

**BUG-3: Pressing Escape while editing a todo saves instead of canceling** (P1)
> "When I'm editing a todo and decide I don't want to change it, pressing Escape commits my edits instead of discarding them. I have to manually undo by re-editing."

**BUG-4: Deleting a todo in one tab doesn't remove it from other tabs** (P1)
> "My colleague and I both have the app open. When they delete a todo, it stays visible on my screen. I have to refresh to see it's gone. Todos added after I opened my tab are the worst — deleting those from another tab does nothing on mine."

**BUG-5: Screen reader announces 'clickable' but gives no context** (P2)
> "Our a11y audit flagged that every todo item is announced as just 'clickable' by screen readers. Users don't know what clicking does — toggle? edit? delete?"

### Feature Requests

**FEAT-1: Undo/Redo support** (P2)
> "I accidentally deleted a todo and couldn't get it back. Basic undo/redo would be a big help. Bonus: Cmd+Z / Cmd+Shift+Z keyboard shortcuts."

**FEAT-2: Keyboard shortcuts for power users** (P3)
> "I use this app all day. Would love keyboard shortcuts: arrow keys to navigate the list, Enter to edit, Delete/Backspace to remove, Escape to deselect."

**FEAT-3: Real-time presence indicators** (P3)
> "When multiple people have the app open, I want to see who's looking at or editing which todo. Like Google Docs cursors, but simpler — just highlight the todo someone is editing."

### Tech Debt

**DEBT-1: Everything re-renders on every change** (P2)
> The entire app re-renders whenever any single todo changes (you can verify in React DevTools). With large lists this contributes to the sluggishness.

**DEBT-2: No test coverage** (P3)
> There are currently no tests. Add test coverage for the most critical code paths. You decide what's most important to test.

**DEBT-3: Heavy prop drilling** (P3)
> The TodoList and TodoItem components receive 10+ props each, threaded down from App. Consider whether there's a cleaner way to manage shared state (context, composition, state library, etc.).

---

## What We're Looking For

- **Prioritization**: How you decide what to work on first, and whether your reasoning is sound
- **Root cause analysis**: Whether you find the actual cause of bugs, not just patch symptoms
- **Code quality**: Readable, maintainable code that follows existing conventions (or intentionally improves them)
- **Communication**: Clear commit messages and write-up explaining your decisions
- **Architecture judgment**: When you refactor vs. work within existing structure

We do NOT care about:
- Pixel-perfect design
- Completing every item
- Using any particular library or pattern — use whatever you think is best

## Questions?

If anything is unclear, make a reasonable assumption and note it in your write-up. That's part of the exercise.
