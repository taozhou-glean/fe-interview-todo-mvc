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
  // Used for drag-and-drop ordering
  order: number;
}

export type FilterMode = 'all' | 'active' | 'completed';

export interface AppState {
  todos: Record<string, Todo>;
  filter: FilterMode;
  searchQuery: string;
  editingId: string | null;
  editingText: string;
  draggedId: string | null;
  connectedUsers: string[];
  syncing: boolean;
}

// WebSocket message types
export interface WsMessage {
  type: 'todo:add' | 'todo:update' | 'todo:delete' | 'todo:reorder' | 'sync:full' | 'user:join' | 'user:leave';
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

export interface WsTodoReorderPayload {
  orderedIds: string[];
}

export interface WsSyncFullPayload {
  todos: Record<string, Todo>;
}

export interface WsUserPayload {
  userId: string;
  users: string[];
}
