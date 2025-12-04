export interface Habit {
  id: string;
  title: string;
  // Map of date string (YYYY-MM-DD) to boolean
  completions: Record<string, boolean>;
}

export type TaskColumn = 'COMPLETE_IT' | 'MONTHLY' | 'YEARLY';
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
  DAILY = 'DAILY',
  TASKS = 'TASKS'
}