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
  activeSubtaskTodoId: string | null;
  setActiveSubtaskTodoId: (id: string | null) => void;
  subtaskDraft: string;
  setSubtaskDraft: (text: string) => void;
}

const VIRTUALIZE_THRESHOLD = 100;

function estimateRowHeight(todo: Todo, editingId: string | null, activeSubtaskTodoId: string | null): number {
  let height = 58; // base: todo-main + padding
  if (todo.subtasks.length > 0) {
    height += 28 * todo.subtasks.length + 8; // subtask items + margin
    height += 24; // progress bar
  }
  if (editingId === todo.id) height += 8;
  if (activeSubtaskTodoId === todo.id) height += 40;
  else height += 28; // add subtask button
  return height;
}

export function TodoList({
  todos,
  actions,
  editingId,
  editingText,
  editInputRef,
  activeSubtaskTodoId,
  setActiveSubtaskTodoId,
  subtaskDraft,
  setSubtaskDraft,
}: TodoListProps) {
  const listRef = useRef<VariableSizeList>(null);

  const getItemSize = useCallback(
    (index: number) => estimateRowHeight(todos[index], editingId, activeSubtaskTodoId),
    [todos, editingId, activeSubtaskTodoId]
  );

  // Reset cached sizes when data changes
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [todos, editingId, activeSubtaskTodoId]);

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
            activeSubtaskTodoId={activeSubtaskTodoId}
            setActiveSubtaskTodoId={setActiveSubtaskTodoId}
            subtaskDraft={subtaskDraft}
            setSubtaskDraft={setSubtaskDraft}
          />
        ))}
      </div>
    );
  }

  const totalHeight = Math.min(
    600,
    todos.reduce((sum, todo) => sum + estimateRowHeight(todo, editingId, activeSubtaskTodoId), 0)
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
            activeSubtaskTodoId={activeSubtaskTodoId}
            setActiveSubtaskTodoId={setActiveSubtaskTodoId}
            subtaskDraft={subtaskDraft}
            setSubtaskDraft={setSubtaskDraft}
          />
        </div>
      )}
    </VariableSizeList>
  );
}
