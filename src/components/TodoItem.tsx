import { MutableRefObject } from 'react';
import { Todo } from '../types';
import { TodoActions } from '../hooks/useTodos';

interface TodoItemProps {
  todo: Todo;
  actions: TodoActions;
  editingId: string | null;
  editingText: string;
  draggedId: string | null;
  editInputRef: MutableRefObject<HTMLInputElement | null>;
  showSubtaskInput: string | null;
  setShowSubtaskInput: (id: string | null) => void;
  newSubtaskText: string;
  setNewSubtaskText: (text: string) => void;
}

export function TodoItem({
  todo,
  actions,
  editingId,
  editingText,
  draggedId,
  editInputRef,
  showSubtaskInput,
  setShowSubtaskInput,
  newSubtaskText,
  setNewSubtaskText,
}: TodoItemProps) {
  const isEditing = editingId === todo.id;
  const isAddingSubtask = showSubtaskInput === todo.id;
  const completedSubtasks = todo.subtasks.filter((subtask) => subtask.completed).length;

  return (
    <div
      className={`todo-item ${todo.completed ? 'completed' : ''} ${draggedId === todo.id ? 'dragging' : ''}`}
      draggable
      onDragStart={() => actions.dragStart(todo.id)}
      onDragOver={(e) => actions.dragOver(e, todo.id)}
      onDragEnd={actions.dragEnd}
    >
      <div className="todo-main">
        <span className="todo-checkbox" onClick={() => actions.toggleTodo(todo.id)}>
          {todo.completed ? '✓' : '○'}
        </span>
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
          <span className="todo-title" onClick={() => actions.startEdit(todo.id)}>
            {todo.title}
          </span>
        )}
        <span className="todo-delete" onClick={() => actions.deleteTodo(todo.id)}>
          ×
        </span>
      </div>

      {todo.subtasks.length > 0 && (
        <div className="subtask-list">
          {todo.subtasks.map((subtask) => (
            <div key={subtask.id} className="subtask-item">
              <span
                className="subtask-checkbox"
                onClick={() => actions.toggleSubtask(todo.id, subtask.id)}
              >
                {subtask.completed ? '✓' : '○'}
              </span>
              <span className={`subtask-title ${subtask.completed ? 'completed' : ''}`}>
                {subtask.title}
              </span>
              <div className="subtask-delete" onClick={() => actions.deleteSubtask(todo.id, subtask.id)}>
                ×
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddingSubtask ? (
        <div className="add-subtask-form">
          <input
            className="subtask-input"
            placeholder="Add subtask..."
            value={newSubtaskText}
            onChange={(e) => setNewSubtaskText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                actions.addSubtask(todo.id, newSubtaskText);
                setNewSubtaskText('');
                setShowSubtaskInput(null);
              }

              if (e.key === 'Escape') {
                setShowSubtaskInput(null);
                setNewSubtaskText('');
              }
            }}
            autoFocus
          />
        </div>
      ) : (
        <div className="add-subtask-btn" onClick={() => setShowSubtaskInput(todo.id)}>
          + Add subtask
        </div>
      )}

      {todo.subtasks.length > 0 && (
        <div className="subtask-progress">
          {completedSubtasks}/{todo.subtasks.length} subtasks done
        </div>
      )}
    </div>
  );
}
