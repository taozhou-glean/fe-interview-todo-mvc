import { useEffect, useRef } from 'react';
import { Todo, WsMessage, WsTodoAddPayload, WsTodoUpdatePayload, WsTodoDeletePayload, WsSyncFullPayload, WsUserPayload } from '../types';
import { initWebSocket, onMessage, disconnect } from '../ws';

interface WsHandlers {
  onTodoAdd: (todo: Todo, userId: string, clientId?: string) => void;
  onTodoUpdate: (id: string, changes: Partial<Todo>, userId: string) => void;
  onTodoDelete: (id: string, title: string, userId: string) => void;
  onSyncFull: (todos: Record<string, Todo>) => void;
  onUsersChange: (users: string[]) => void;
}

/**
 * Manages WebSocket connection lifecycle and message routing.
 * Uses a ref to always have current handlers, avoiding stale closures
 * from the useEffect dependency array.
 */
export function useWebSocket(
  todos: Record<string, Todo>,
  handlers: WsHandlers
) {
  // Keep handlers fresh via ref so the effect doesn't need to re-subscribe
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  const todosRef = useRef(todos);
  todosRef.current = todos;

  useEffect(() => {
    initWebSocket();

    const unsubscribe = onMessage((msg: WsMessage) => {
      switch (msg.type) {
        case 'sync:full': {
          const { todos } = msg.payload as WsSyncFullPayload;
          handlersRef.current.onSyncFull(todos);
          break;
        }

        case 'todo:add': {
          const { todo, clientId } = msg.payload as WsTodoAddPayload & { clientId?: string };
          handlersRef.current.onTodoAdd(todo, msg.userId, clientId);
          break;
        }

        case 'todo:update': {
          const { id, changes } = msg.payload as WsTodoUpdatePayload;
          handlersRef.current.onTodoUpdate(id, changes, msg.userId);
          break;
        }

        case 'todo:delete': {
          const { id } = msg.payload as WsTodoDeletePayload;
          const title = todosRef.current[id]?.title ?? 'a todo';
          handlersRef.current.onTodoDelete(id, title, msg.userId);
          break;
        }

        case 'user:join': {
          const { users } = msg.payload as WsUserPayload;
          handlersRef.current.onUsersChange(users);
          break;
        }

        case 'user:leave': {
          const { users } = msg.payload as WsUserPayload;
          handlersRef.current.onUsersChange(users);
          break;
        }
      }
    });

    return () => {
      unsubscribe();
      disconnect();
    };
  }, []);
}
