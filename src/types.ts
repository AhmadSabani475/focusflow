/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface MainGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  deadline: string; // ISO date string
  progress: number; // 0 to 100
  isActive: boolean;
  createdAt: string;
}

export type CheckpointStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

export interface WeeklyCheckpoint {
  id: string;
  goalId: string;
  weekNumber: number;
  weekStartDate: string; // ISO date string or YYYY-MM-DD
  title: string;
  targetDescription?: string;
  status: CheckpointStatus;
  createdAt: string;
}

export type TaskPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TaskStatus = 'TODO' | 'DONE';

export interface DailyTask {
  id: string;
  userId: string;
  checkpointId?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
  estimatedMinutes?: number;
  isAiGenerated: boolean;
  createdAt: string;
}

// Session info for auth endpoints
export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}
