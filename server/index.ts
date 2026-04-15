import { WebSocketServer, WebSocket } from 'ws';
import { addTodo, updateTodo, deleteTodo, getAllTodos, addUser, removeUser } from './store';
import { WsMessage, WsTodoAddPayload, WsTodoUpdatePayload, WsTodoDeletePayload, WsTodoReorderPayload } from '../src/types';

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

const clients = new Map<WebSocket, string>();

function broadcast(msg: WsMessage, exclude?: WebSocket): void {
  const data = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  console.log('[Server] New connection');

  ws.on('message', (raw: Buffer) => {
    try {
      const msg: WsMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'user:join': {
          const userId = msg.userId;
          clients.set(ws, userId);
          const users = addUser(userId);
          // Send full state to new client
          ws.send(JSON.stringify({
            type: 'sync:full',
            payload: { todos: getAllTodos() },
            userId: 'server',
            timestamp: Date.now(),
          }));
          // Broadcast user joined
          broadcast({
            type: 'user:join',
            payload: { userId, users },
            userId: 'server',
            timestamp: Date.now(),
          });
          break;
        }

        case 'todo:add': {
          const { todo } = msg.payload as WsTodoAddPayload;
          addTodo(todo);
          broadcast(msg, ws);
          break;
        }

        case 'todo:update': {
          const { id, changes } = msg.payload as WsTodoUpdatePayload;
          const updated = updateTodo(id, changes);
          if (updated) {
            broadcast(msg, ws);
          }
          break;
        }

        case 'todo:delete': {
          const { id } = msg.payload as WsTodoDeletePayload;
          deleteTodo(id);
          broadcast(msg, ws);
          break;
        }

        case 'todo:reorder': {
          const { orderedIds: _orderedIds } = msg.payload as WsTodoReorderPayload;
          // Server doesn't validate reorder, just broadcasts
          broadcast(msg, ws);
          break;
        }

        default:
          console.warn('[Server] Unknown message type:', msg.type);
      }
    } catch (e) {
      console.warn('[Server] Failed to process message:', e);
    }
  });

  ws.on('close', () => {
    const userId = clients.get(ws);
    if (userId) {
      clients.delete(ws);
      const users = removeUser(userId);
      broadcast({
        type: 'user:leave',
        payload: { userId, users },
        userId: 'server',
        timestamp: Date.now(),
      });
    }
  });
});

console.log(`[Server] WebSocket server running on ws://localhost:${PORT}`);
