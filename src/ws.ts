import { WsMessage } from './types';

/**
 * WebSocket client — manages connection, reconnection, and message routing.
 *
 * Echo filtering rules (who sees what):
 * - todo:add — Server broadcasts to ALL clients including sender, because the
 *   server assigns the real ID. Client needs the echo to replace its temp ID.
 * - todo:update, todo:delete — Server broadcasts to all EXCEPT sender. The sender
 *   already applied the change optimistically. Client-side filters by userId as backup.
 * - sync:full, user:join, user:leave — Server-originated, always processed.
 */

const WS_URL = 'ws://localhost:8080';

type MessageHandler = (msg: WsMessage) => void;

let socket: WebSocket | null = null;
let messageHandlers: MessageHandler[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

const DISPLAY_NAME_KEY = 'todo-mvc-display-name';
let displayName = localStorage.getItem(DISPLAY_NAME_KEY) || `user-${Math.random().toString(36).slice(2, 8)}`;
localStorage.setItem(DISPLAY_NAME_KEY, displayName);

function connect() {
  if (socket && socket.readyState !== WebSocket.CLOSED) return;

  intentionalClose = false;
  socket = new WebSocket(WS_URL);

  socket.onopen = () => {
    console.log('[WS] Connected as', displayName);
    send({
      type: 'user:join',
      payload: { userId: displayName },
      userId: displayName,
      timestamp: Date.now(),
    });
  };

  socket.onmessage = (event) => {
    try {
      const msg: WsMessage = JSON.parse(event.data);
      // Client ignores its own echoes, except todo:add (server assigns ID)
      if (msg.userId === displayName && msg.type !== 'todo:add') return;
      messageHandlers.forEach((handler) => handler(msg));
    } catch (e) {
      console.warn('[WS] Failed to parse message:', e);
    }
  };

  socket.onclose = () => {
    if (intentionalClose) return;
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
  intentionalClose = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
  messageHandlers = [];
}

export function getDisplayName(): string {
  return displayName;
}

export function setDisplayName(newName: string): void {
  const oldName = displayName;
  displayName = newName;
  localStorage.setItem(DISPLAY_NAME_KEY, newName);

  // Tell server to remove old identity, then join with new one
  if (oldName !== newName) {
    send({
      type: 'user:leave',
      payload: { userId: oldName },
      userId: oldName,
      timestamp: Date.now(),
    });
  }
  send({
    type: 'user:join',
    payload: { userId: newName },
    userId: newName,
    timestamp: Date.now(),
  });
}
