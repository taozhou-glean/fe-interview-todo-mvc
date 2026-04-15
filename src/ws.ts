import { WsMessage } from './types';

const WS_URL = 'ws://localhost:8080';

type MessageHandler = (msg: WsMessage) => void;

let socket: WebSocket | null = null;
let messageHandlers: MessageHandler[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const USERID_KEY = 'todo-mvc-userid';
let userId = localStorage.getItem(USERID_KEY) || `user-${Math.random().toString(36).slice(2, 8)}`;
localStorage.setItem(USERID_KEY, userId);

function connect() {
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('[WS] Connected as', userId);
    send({
      type: 'user:join',
      payload: { userId },
      userId,
      timestamp: Date.now(),
    });
  };

  socket.onmessage = (event) => {
    try {
      const msg: WsMessage = JSON.parse(event.data);
      // Don't process our own messages, except todo:add (server assigns ID)
      if (msg.userId === userId && msg.type !== 'todo:add') return;
      messageHandlers.forEach((handler) => handler(msg));
    } catch (e) {
      console.warn('[WS] Failed to parse message:', e);
    }
  };

  socket.onclose = () => {
    console.log('[WS] Disconnected. Reconnecting in 3s...');
    reconnectTimer = setTimeout(connect, 3000);
  };

  socket.onerror = (err) => {
    console.warn('[WS] Error:', err);
    socket?.close();
  };
}

export function initWebSocket(): void {
  connect();
}

export function send(msg: WsMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

export function onMessage(handler: MessageHandler): () => void {
  messageHandlers.push(handler);
  return () => {
    messageHandlers = messageHandlers.filter((h) => h !== handler);
  };
}

export function disconnect(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
  messageHandlers = [];
}

export function getUserId(): string {
  return userId;
}

export function setUserId(newId: string): void {
  userId = newId;
  localStorage.setItem(USERID_KEY, newId);
  // Re-announce to server with new identity
  send({
    type: 'user:join',
    payload: { userId: newId },
    userId: newId,
    timestamp: Date.now(),
  });
}
