export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  subtasks: SubTask[];
}

export type FilterMode = 'all' | 'active' | 'completed';

export interface AppState {
  todos: Record<string, Todo>;
  filter: FilterMode;
  searchQuery: string;
  editingId: string | null;
  editingText: string;
  connectedUsers: string[];
  syncing: boolean;
}

// WebSocket message types
export interface WsMessage {
  type: 'todo:add' | 'todo:update' | 'todo:delete' | 'sync:full' | 'user:join' | 'user:leave';
  payload: unknown;
  userId: string;
  timestamp: number;
}

export interface WsTodoAddPayload {
  todo: Todo;
}

export interface WsTodoUpdatePayload {
  id: string;
  changes: Partial<Todo>;
}

export interface WsTodoDeletePayload {
  id: string;
}

export interface WsSyncFullPayload {
  todos: Record<string, Todo>;
}

export interface WsUserPayload {
  userId: string;
  users: string[];
}
