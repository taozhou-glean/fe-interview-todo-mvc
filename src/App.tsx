import { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Filters } from './components/Filters';
import { TodoList } from './components/TodoList';
import { useTodos } from './hooks/useTodos';
import { useWebSocket } from './hooks/useWebSocket';
import { getDisplayName } from './ws';
import './App.css';

export default function App() {
  const { state, actions, filteredTodos, editInputRef, applyWsUpdate } = useTodos();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [newTodoText, setNewTodoText] = useState('');
  const [activeSubtaskTodoId, setActiveSubtaskTodoId] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState('');

  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useWebSocket(state.todos, {
    onSyncFull: (serverTodos) => {
      applyWsUpdate((prev) => ({ ...prev, todos: serverTodos, syncing: false }));
    },
    onTodoAdd: (todo, userId, clientId) => {
      applyWsUpdate((prev) => {
        const next = { ...prev.todos };
        // If this is our own todo coming back with a server ID, remove the temp entry
        if (clientId && next[clientId]) {
          delete next[clientId];
        }
        next[todo.id] = todo;
        return { ...prev, todos: next };
      });
      if (userId !== getDisplayName()) {
        showToast(`${userId} added "${todo.title}"`);
      }
    },
    onTodoUpdate: (id, changes, userId) => {
      applyWsUpdate((prev) => ({
        ...prev,
        todos: {
          ...prev.todos,
          [id]: { ...prev.todos[id], ...changes },
        },
      }));
      showToast(`${userId} updated "${state.todos[id]?.title ?? 'a todo'}"`);
    },
    onTodoDelete: (id, title, userId) => {
      applyWsUpdate((prev) => {
        const nextTodos = { ...prev.todos };
        delete nextTodos[id];
        return { ...prev, todos: nextTodos };
      });
      showToast(`${userId} deleted "${title}"`);
    },
    onUsersChange: (users) => {
      applyWsUpdate((prev) => ({ ...prev, connectedUsers: users }));
    },
  });

  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    actions.addTodo(newTodoText);
    setNewTodoText('');
  };

  const totalCount = Object.keys(state.todos).length;
  const activeCount = Object.values(state.todos).filter((todo) => !todo.completed).length;
  const completedCount = totalCount - activeCount;
  const allCompleted = totalCount > 0 && Object.values(state.todos).every((todo) => todo.completed);

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}
      <Header connectedUsers={state.connectedUsers} />
      <div className="new-todo-container">
        <input
          className="new-todo"
          placeholder="What needs to be done?"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
        />
      </div>
      <Filters
        filter={state.filter}
        searchQuery={state.searchQuery}
        totalCount={totalCount}
        activeCount={activeCount}
        completedCount={completedCount}
        onFilterChange={actions.setFilter}
        onSearchChange={actions.setSearchQuery}
      />
      {state.syncing && (
        <div className="sync-status">Syncing todos...</div>
      )}
      {totalCount > 0 && (
        <div className="toggle-all-container">
          <div className="toggle-all" onClick={actions.toggleAll}>
            {allCompleted ? '☑' : '☐'} Mark all as {allCompleted ? 'active' : 'complete'}
          </div>
        </div>
      )}
      <TodoList
        todos={filteredTodos}
        actions={actions}
        editingId={state.editingId}
        editingText={state.editingText}
        editInputRef={editInputRef}
        activeSubtaskTodoId={activeSubtaskTodoId}
        setActiveSubtaskTodoId={setActiveSubtaskTodoId}
        subtaskDraft={subtaskDraft}
        setSubtaskDraft={setSubtaskDraft}
      />
      {totalCount > 0 && (
        <div className="footer">
          <span className="todo-count">
            {activeCount} item{activeCount !== 1 ? 's' : ''} left
          </span>
          {completedCount > 0 && (
            <div className="clear-completed" onClick={actions.clearCompleted}>
              Clear completed ({completedCount})
            </div>
          )}
        </div>
      )}
    </div>
  );
}
