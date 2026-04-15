import { MutableRefObject } from 'react';
import { Todo } from '../types';
import { TodoActions } from '../hooks/useTodos';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
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

export function TodoList({
  todos,
  actions,
  editingId,
  editingText,
  draggedId,
  editInputRef,
  showSubtaskInput,
  setShowSubtaskInput,
  newSubtaskText,
  setNewSubtaskText,
}: TodoListProps) {
  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          actions={actions}
          editingId={editingId}
          editingText={editingText}
          draggedId={draggedId}
          editInputRef={editInputRef}
          showSubtaskInput={showSubtaskInput}
          setShowSubtaskInput={setShowSubtaskInput}
          newSubtaskText={newSubtaskText}
          setNewSubtaskText={setNewSubtaskText}
        />
      ))}
    </div>
  );
}
