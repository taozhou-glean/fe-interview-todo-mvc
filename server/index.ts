import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { randomUUID } from 'crypto';
import { addTodo, updateTodo, deleteTodo, getAllTodos, addUser, removeUser } from './store';
import { WsMessage, WsTodoAddPayload, WsTodoUpdatePayload, WsTodoDeletePayload } from '../src/types';

/**
 * WebSocket server — source of truth for todos and presence.
 *
 * Broadcasting rules:
 * - todo:add → broadcast to ALL (including sender) because server assigns the real UUID.
 * - todo:update, todo:delete → broadcast to all EXCEPT sender (sender applied optimistically).
 * - user:join, user:leave → broadcast to ALL so every client sees updated presence.
 * - sync:full → sent only to the joining client, not broadcast.
 */

const PORT = 8080;

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET' && req.url === '/todos') {
    const todos = getAllTodos();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(todos));
    return;
  }

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

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
          const newUserId = msg.userId;
          // Remove old identity for this socket if renaming
          const oldUserId = clients.get(ws);
          if (oldUserId && oldUserId !== newUserId) {
            removeUser(oldUserId);
          }
          clients.set(ws, newUserId);
          const users = addUser(newUserId);
          // Send full state to new client
          ws.send(JSON.stringify({
            type: 'sync:full',
            payload: { todos: getAllTodos() },
            userId: 'server',
            timestamp: Date.now(),
          }));
          // Broadcast updated user list
          broadcast({
            type: 'user:join',
            payload: { userId: newUserId, users },
            userId: 'server',
            timestamp: Date.now(),
          });
          break;
        }

        case 'user:leave': {
          // Client-initiated leave (e.g. before rename). Don't remove from clients map.
          const leavingId = msg.userId;
          const users = removeUser(leavingId);
          broadcast({
            type: 'user:leave',
            payload: { userId: leavingId, users },
            userId: 'server',
            timestamp: Date.now(),
          });
          break;
        }

        case 'todo:add': {
          const { todo: clientTodo, clientId } = msg.payload as WsTodoAddPayload;
          const todo: typeof clientTodo = { ...clientTodo, id: randomUUID() };
          addTodo(todo);
          // Broadcast to all including sender so everyone gets the server-assigned ID
          const addMsg: WsMessage = {
            type: 'todo:add',
            payload: { todo, clientId },
            userId: msg.userId,
            timestamp: Date.now(),
          };
          broadcast(addMsg);
          break;
        }

        case 'todo:update': {
          const { id, changes } = msg.payload as WsTodoUpdatePayload;
          const updated = updateTodo(id, changes);
          if (updated) {
            // Broadcast server-authoritative result, not the original client message
            broadcast({
              type: 'todo:update',
              payload: { id, changes: { ...changes, updatedAt: updated.updatedAt } },
              userId: msg.userId,
              timestamp: Date.now(),
            }, ws);
          }
          break;
        }

        case 'todo:delete': {
          const { id } = msg.payload as WsTodoDeletePayload;
          deleteTodo(id);
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

server.listen(PORT, () => {
  console.log(`[Server] WebSocket server running on ws://localhost:${PORT}`);
  console.log(`[Server] REST API available at http://localhost:${PORT}/todos`);
});
