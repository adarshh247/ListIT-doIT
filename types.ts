
export interface Habit {
  id: string;
  title: string;
  // Map of date string (YYYY-MM-DD for daily, YYYY-MM for monthly) to boolean
  completions: Record<string, boolean>;
  type?: 'DAILY' | 'MONTHLY';
}

export type TaskColumn = string;
export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Task {
  id: string;
  title: string;
  column: TaskColumn;
  completed: boolean;
  priority: TaskPriority;
  createdAt: number;
}

export enum AppMode {
  PROTOCOL = 'PROTOCOL',
  TASKS = 'TASKS'
}

export type ProtocolType = 'DAILY' | 'MONTHLY';
