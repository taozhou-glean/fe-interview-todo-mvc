import { useState } from 'react';
import { Header } from './components/Header';
import { Filters } from './components/Filters';
import { TodoList } from './components/TodoList';
import { useTodos } from './hooks/useTodos';
import { useWebSocket } from './hooks/useWebSocket';
import './App.css';

export default function App() {
  const { state, actions, filteredTodos, editInputRef, applyWsUpdate } = useTodos();
  const [toast, setToast] = useState<string | null>(null);
  const [newTodoText, setNewTodoText] = useState('');
  const [showSubtaskInput, setShowSubtaskInput] = useState<string | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  useWebSocket(state.todos, {
    onSyncFull: (todos) => {
      applyWsUpdate((prev) => ({ ...prev, todos: { ...prev.todos, ...todos }, syncing: false }));
    },
    onTodoAdd: (todo, userId) => {
      applyWsUpdate((prev) => ({ ...prev, todos: { ...prev.todos, [todo.id]: todo } }));
      showToast(`${userId} added "${todo.title}"`);
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
        draggedId={state.draggedId}
        editInputRef={editInputRef}
        showSubtaskInput={showSubtaskInput}
        setShowSubtaskInput={setShowSubtaskInput}
        newSubtaskText={newSubtaskText}
        setNewSubtaskText={setNewSubtaskText}
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
