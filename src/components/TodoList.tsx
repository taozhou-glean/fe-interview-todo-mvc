import { MutableRefObject, useCallback, useEffect, useRef } from 'react';
import { VariableSizeList } from 'react-window';
import { Todo } from '../types';
import { TodoActions } from '../hooks/useTodos';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  actions: TodoActions;
  editingId: string | null;
  editingText: string;
  editInputRef: MutableRefObject<HTMLInputElement | null>;
  showSubtaskInput: string | null;
  setShowSubtaskInput: (id: string | null) => void;
  newSubtaskText: string;
  setNewSubtaskText: (text: string) => void;
}

const VIRTUALIZE_THRESHOLD = 100;

function estimateRowHeight(todo: Todo, editingId: string | null, showSubtaskInput: string | null): number {
  let height = 58; // base: todo-main + padding
  if (todo.subtasks.length > 0) {
    height += 28 * todo.subtasks.length + 8; // subtask items + margin
    height += 24; // progress bar
  }
  if (editingId === todo.id) height += 8;
  if (showSubtaskInput === todo.id) height += 40;
  else height += 28; // add subtask button
  return height;
}

export function TodoList({
  todos,
  actions,
  editingId,
  editingText,
  editInputRef,
  showSubtaskInput,
  setShowSubtaskInput,
  newSubtaskText,
  setNewSubtaskText,
}: TodoListProps) {
  const listRef = useRef<VariableSizeList>(null);

  const getItemSize = useCallback(
    (index: number) => estimateRowHeight(todos[index], editingId, showSubtaskInput),
    [todos, editingId, showSubtaskInput]
  );

  // Reset cached sizes when data changes
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [todos, editingId, showSubtaskInput]);

  if (todos.length <= VIRTUALIZE_THRESHOLD) {
    return (
      <div className="todo-list">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            actions={actions}
            editingId={editingId}
            editingText={editingText}
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

  const totalHeight = Math.min(
    600,
    todos.reduce((sum, todo, i) => sum + estimateRowHeight(todo, editingId, showSubtaskInput), 0)
  );

  return (
    <VariableSizeList
      ref={listRef}
      height={totalHeight}
      itemCount={todos.length}
      itemSize={getItemSize}
      width="100%"
      className="todo-list"
    >
      {({ index, style }) => (
        <div style={style}>
          <TodoItem
            todo={todos[index]}
            actions={actions}
            editingId={editingId}
            editingText={editingText}
            editInputRef={editInputRef}
            showSubtaskInput={showSubtaskInput}
            setShowSubtaskInput={setShowSubtaskInput}
            newSubtaskText={newSubtaskText}
            setNewSubtaskText={setNewSubtaskText}
          />
        </div>
      )}
    </VariableSizeList>
  );
}
