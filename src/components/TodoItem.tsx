import { memo, MutableRefObject } from 'react';
import { Todo } from '../types';
import { TodoActions } from '../hooks/useTodos';

interface TodoItemProps {
  todo: Todo;
  actions: TodoActions;
  editingId: string | null;
  editingText: string;
  editInputRef: MutableRefObject<HTMLInputElement | null>;
  activeSubtaskTodoId: string | null;
  setActiveSubtaskTodoId: (id: string | null) => void;
  subtaskDraft: string;
  setSubtaskDraft: (text: string) => void;
}

export const TodoItem = memo(function TodoItem({
  todo,
  actions,
  editingId,
  editingText,
  editInputRef,
  activeSubtaskTodoId,
  setActiveSubtaskTodoId,
  subtaskDraft,
  setSubtaskDraft,
}: TodoItemProps) {
  const isEditing = editingId === todo.id;
  const isAddingSubtask = activeSubtaskTodoId === todo.id;
  const completedSubtasks = todo.subtasks.filter((subtask) => subtask.completed).length;

  return (
    <div className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      <div className="todo-main">
        <input
          type="checkbox"
          className="todo-checkbox"
          checked={todo.completed}
          onChange={() => actions.toggleTodo(todo.id)}
          aria-label={`Mark "${todo.title}" as ${todo.completed ? 'active' : 'complete'}`}
        />
        {isEditing ? (
          <input
            ref={(node) => {
              editInputRef.current = node;
            }}
            className="todo-edit"
            value={editingText}
            onChange={(e) => actions.setEditingText(e.target.value)}
            onBlur={actions.saveEdit}
            onKeyDown={actions.editKeyDown}
          />
        ) : (
          <label className="todo-title" onClick={() => actions.startEdit(todo.id)}>
            {todo.title}
          </label>
        )}
        <button
          className="todo-delete"
          onClick={() => actions.deleteTodo(todo.id)}
          aria-label={`Delete "${todo.title}"`}
        >
          ×
        </button>
      </div>

      {todo.subtasks.length > 0 && (
        <div className="subtask-list">
          {todo.subtasks.map((subtask) => (
            <div key={subtask.id} className="subtask-item">
              <input
                type="checkbox"
                className="subtask-checkbox"
                checked={subtask.completed}
                onChange={() => actions.toggleSubtask(todo.id, subtask.id)}
                aria-label={`Mark subtask "${subtask.title}" as ${subtask.completed ? 'active' : 'complete'}`}
              />
              <span className={`subtask-title ${subtask.completed ? 'completed' : ''}`}>
                {subtask.title}
              </span>
              <button
                className="subtask-delete"
                onClick={() => actions.deleteSubtask(todo.id, subtask.id)}
                aria-label={`Delete subtask "${subtask.title}"`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {isAddingSubtask ? (
        <div className="add-subtask-form">
          <input
            className="subtask-input"
            placeholder="Add subtask..."
            value={subtaskDraft}
            onChange={(e) => setSubtaskDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                actions.addSubtask(todo.id, subtaskDraft);
                setSubtaskDraft('');
                setActiveSubtaskTodoId(null);
              }

              if (e.key === 'Escape') {
                setActiveSubtaskTodoId(null);
                setSubtaskDraft('');
              }
            }}
            autoFocus
          />
        </div>
      ) : (
        <button className="add-subtask-btn" onClick={() => setActiveSubtaskTodoId(todo.id)}>
          + Add subtask
        </button>
      )}

      {todo.subtasks.length > 0 && (
        <div className="subtask-progress">
          {completedSubtasks}/{todo.subtasks.length} subtasks done
        </div>
      )}
    </div>
  );
});
