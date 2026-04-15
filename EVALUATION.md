# EVALUATION RUBRIC (Internal — Do NOT share with candidate)

## Architecture Overview

The codebase is split across multiple files to test whether candidates can trace bugs across module boundaries:

```
src/
├── App.tsx                  (composition shell — wires hooks to components)
├── components/
│   ├── Header.tsx           (clean)
│   ├── Filters.tsx          (RED HERRING: index key on static array)
│   ├── TodoList.tsx         (clean passthrough)
│   └── TodoItem.tsx         (BUG-5: span-based interactive elements)
├── hooks/
│   ├── useTodos.ts          (BUG-1: order collision, BUG-3: escape→blur→save, RED HERRINGS: unused ref, useCallback deps)
│   └── useWebSocket.ts      (BUG-4: stale closure reads `todos` instead of `todosRef.current`)
├── utils/
│   ├── search.ts            (BUG-2: O(n²) per-todo "relevance scoring" + no debounce)
│   ├── ordering.ts          (clean)
│   └── ids.ts               (clean — numeric string IDs contribute to BUG-1)
├── storage.ts               (clean — Record<string,Todo> contributes to BUG-1)
├── ws.ts                    (clean)
└── types.ts                 (clean)
```

## Bug Root Causes

### BUG-1: Todos randomly reorder / new todos appear in wrong position

**Location:** `hooks/useTodos.ts` → `addTodo` function + `utils/ids.ts` + `storage.ts`

**Root cause (multi-file chain):**
1. `ids.ts` generates sequential numeric string IDs ("1", "2", "3"...) — V8 sorts these as integer keys
2. `storage.ts` stores todos as `Record<string, Todo>` — `Object.keys()` returns integer keys in numeric order, not insertion order
3. `useTodos.ts` → `addTodo` computes `order: Object.keys(state.todos).length` — after deletions, this produces order values that collide with existing todos

The candidate must trace through three files to understand the full chain. The `ordering.ts` utility has a correct `getNextOrder()` function that uses `Math.max(...)` — but `addTodo` doesn't use it (it inlines the wrong calculation).

**Proper fix:** Use `getNextOrder(state.todos)` from ordering.ts, OR use UUIDs for IDs, OR store as array.

**Signals:**
- Junior: "Fixed by adding a sort" (patches symptom)
- Mid: Identifies the order collision in addTodo and fixes it
- Senior: Traces the full chain (IDs + storage format + order calculation), notices `getNextOrder` already exists and wonders why it's not used

---

### BUG-2: App freezes when typing in search

**Location:** `utils/search.ts` → `computeRelevanceScore()` + `components/Filters.tsx` (no debounce)

**Root cause (hidden behind "relevance scoring" abstraction):**
1. `search.ts` has a `computeRelevanceScore()` function that looks professional with JSDoc and a scoring system. The function takes `allTodos` as a parameter and iterates ALL todos for each todo being scored — creating O(n²) per todo, O(n³) overall. This is disguised as a "cross-reference boost" feature.
2. `Filters.tsx` calls `onSearchChange` directly from the input's `onChange` — no debounce anywhere.

The candidate must read into the search utility (not just the component) and understand the algorithmic complexity. The "cross-reference" loop also has a logical bug: any todo with subtasks gets boosted if ANY subtask in the entire dataset matches, regardless of whether it's related.

**Proper fix:**
- Remove the cross-reference loop (each todo should only check its own subtasks)
- Add debounce (300-500ms) to the search input
- Optionally: memoize filtered results

**Signals:**
- Junior: Adds debounce only (helps but doesn't fix O(n³))
- Mid: Finds the unnecessary nested loop in computeRelevanceScore
- Senior: Fixes both, identifies the logical bug in results, considers memoization

---

### BUG-3: Escape saves instead of canceling

**Location:** `hooks/useTodos.ts` → `editKeyDown` + `components/TodoItem.tsx` → `onBlur={actions.saveEdit}`

**Root cause (split across hook + component):**
1. In `useTodos.ts`, `editKeyDown` handles Escape by calling `(e.target as HTMLInputElement).blur()` instead of `cancelEdit()`
2. In `TodoItem.tsx`, the edit input has `onBlur={actions.saveEdit}` — so blur triggers save
3. There's a `cancelEdit` function AND an `isCancelingRef` that looks like the correct solution — but `cancelEdit()` is never called from the Escape path, and the ref is set but never checked by `saveEdit`

The candidate must connect the dots: the Escape handler is in the hook, the onBlur wiring is in the component, and the "fix" (isCancelingRef) already exists but is incomplete.

**Proper fix:** Replace `.blur()` with `cancelEdit()` in the Escape handler, AND have `saveEdit` check `isCancelingRef.current`.

**Signals:**
- Junior: Removes `onBlur` entirely (breaks click-away-to-save)
- Mid: Calls cancelEdit() and adds the ref check
- Senior: Understands the full event lifecycle (blur fires on unmount too) and implements clean coordination

---

### BUG-4: Deleting a todo in one tab doesn't remove it from other tabs

**Location:** `hooks/useWebSocket.ts` → `todo:delete` case (line ~57)

**Root cause (stale closure in ONE specific case):**
The hook follows a correct pattern for MOST handlers: uses `handlersRef.current.onXxx()` which always has fresh handlers. It even has `todosRef` that tracks current todos. But in the `todo:delete` case specifically, it reads `todos[id].title` from the `todos` parameter (captured in the `useEffect([], [])` closure at mount time) instead of `todosRef.current[id].title`.

This means:
- `todos` is stale (frozen at mount time values)
- For any todo added after mount, `todos[id]` is `undefined`
- `.title` on `undefined` throws a silent TypeError in the WS handler — the delete never propagates to the other tab's state
- The todo stays visible in the other tab until a manual refresh
- The OTHER handlers (add, update, sync) work correctly because they go through the ref

The candidate must notice that ONE case out of five reads from the wrong source, while the correct pattern (`todosRef.current`) exists right there but isn't used.

**Proper fix:** Change `todos[id].title` to `todosRef.current[id]?.title ?? 'a todo'`

**Signals:**
- Junior: Adds a null check on just this line
- Mid: Identifies the stale closure and uses todosRef.current
- Senior: Notices the systemic pattern — asks why `todosRef` exists if the handlers already use `handlersRef`, recognizes this is a code smell indicating the hook's architecture has inconsistencies

---

### BUG-5: Screen reader accessibility (partial)

**Location:** `components/TodoItem.tsx`

**Root cause (partially fixed — harder to spot):**
The Filters component uses proper `<button>` elements. But TodoItem uses `<span onClick>` for all per-item interactive elements: checkboxes, delete buttons, todo titles, and subtask toggles. No ARIA roles, labels, or keyboard focus management.

This is harder to spot than "everything is a div" because the app DOES use some semantic HTML (buttons in Filters, inputs for editing). The a11y issues are localized to TodoItem.

**Proper fix:**
- Replace `span.todo-checkbox` with `<input type="checkbox">` or `<button role="checkbox">`
- Replace `span.todo-delete` with `<button aria-label="Delete: {title}">`
- Replace `span.todo-title` with a focusable element
- Add keyboard navigation (tabIndex, Enter/Space handlers)

**Signals:**
- Junior: Adds role="button" to spans
- Mid: Replaces spans with semantic HTML
- Senior: Semantic HTML + ARIA labels + keyboard focus + tests with screen reader

---

## Red Herrings (NOT bugs — will waste time if candidate flags them)

### RED HERRING 1: Index key in Filters.tsx
`FILTER_OPTIONS.map((opt, idx) => <button key={idx}>)` — The array is static and never reordered. Index keys are fine here.

### RED HERRING 2: useCallback deps in useTodos.ts
Several useCallback hooks read `state.todos` from closure but list `[state.todos]` in deps. This looks like it could cause stale closures, but it's correct: the callbacks are recreated when `state.todos` changes, so the closure is always fresh.

### RED HERRING 3: "Unused" todosSnapshotRef in useTodos.ts
`todosSnapshotRef` is assigned every render but never read by any visible function. It's exported from the hook. Looks like dead code but isn't a bug.

---

## Architectural Problems (for DEBT items)

### DEBT-1: Re-render problem
The entire `AppState` is in a single `useState` inside `useTodos`. Any change to any field re-renders all components. No `React.memo` on TodoItem, no `useMemo` for filtered lists.

### DEBT-2: Testing
No tests exist. Look for: Do they test the edit blur/keydown interaction? WebSocket handlers? Search algorithm?

### DEBT-3: Component design
The app is already split into components, but the prop drilling is heavy (TodoList → TodoItem passes 10+ props). Look for whether candidates improve this with context, composition, or restructuring.

---

## Overall Evaluation

| Rating | Description |
|--------|-------------|
| **Strong Hire** | Fixes P0s with root cause understanding. Traces bugs across files. Tackles 1-2 features or debt items. Clear communication. Production-quality code. |
| **Hire** | Fixes most bugs correctly. At least traces into the utility/hook files. Reasonable prioritization. Code is clean. |
| **Lean Hire** | Fixes bugs but some are surface-level patches. Stays mostly in components without tracing into hooks/utils. |
| **No Hire** | Only patches symptoms. No explanation of trade-offs. Code quality is poor. Or: completed everything suspiciously fast with AI-generated code they can't explain in follow-up. |

## AI Usage Detection

Signs the candidate relied heavily on AI without understanding:
- Fixes all bugs but the explanations in write-up are vague or generic
- "Finds" BUG-4 immediately without explaining why todosRef exists but isn't used
- Code style is inconsistent between files
- Overly verbose comments that explain obvious things
- Perfect solutions for simple bugs but confused about the harder ones (BUG-1 chain, BUG-4 stale closure)
- Can't explain WHY their fix works in the follow-up interview
- Flags all red herrings as bugs (AI pattern-matches aggressively)

**Important:** Using AI is fine. We want to see that they **understand** the AI's output and can **modify/improve** it. Follow-up questions:
- "Walk me through your BUG-4 fix. Why doesn't the delete propagate to other tabs?" (Tests stale closure understanding)
- "Why is the search slow? What's the time complexity?" (Tests algorithmic thinking)
- "The cancel ref flag already existed — why wasn't it working?" (Tests attention to detail)
