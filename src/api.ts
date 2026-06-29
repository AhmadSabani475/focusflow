/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MainGoal, WeeklyCheckpoint, DailyTask, AuthResponse } from './types';

let authToken = localStorage.getItem('focusflow_token') || '';

export function setToken(token: string) {
  authToken = token;
  if (token) {
    localStorage.setItem('focusflow_token', token);
  } else {
    localStorage.removeItem('focusflow_token');
  }
}

export function getToken(): string {
  return authToken;
}

export function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

// Global fetch wrapper to handle authorization and responses
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/api/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errBody = await response.json();
      errorMessage = errBody.error || errorMessage;
    } catch (_) {
      // ignore
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Authentication
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const data = await fetchApi<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setToken(data.token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await fetchApi<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetchApi<any>('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore logout errors to ensure client cleanup
    }
    setToken('');
    localStorage.removeItem('focusflow_user');
  },

  // Goals
  async getActiveGoal(): Promise<MainGoal | null> {
    return fetchApi<MainGoal | null>('/api/goals');
  },

  async getAllGoals(): Promise<MainGoal[]> {
    return fetchApi<MainGoal[]>('/api/goals/all');
  },

  async activateGoal(id: string): Promise<{ success: boolean; message: string }> {
    return fetchApi<{ success: boolean; message: string }>(`/api/goals/${id}/activate`, {
      method: 'POST',
    });
  },

  async createGoal(title: string, description: string | undefined, deadline: string): Promise<MainGoal> {
    return fetchApi<MainGoal>('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ title, description, deadline }),
    });
  },

  async updateGoal(id: string, updates: Partial<MainGoal>): Promise<MainGoal> {
    return fetchApi<MainGoal>(`/api/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteGoal(id: string): Promise<void> {
    await fetchApi<any>(`/api/goals/${id}`, { method: 'DELETE' });
  },

  // Checkpoints
  async getCheckpoints(): Promise<WeeklyCheckpoint[]> {
    return fetchApi<WeeklyCheckpoint[]>('/api/checkpoints');
  },

  async createCheckpoint(
    goalId: string,
    weekNumber: number,
    weekStartDate: string,
    title: string,
    targetDescription?: string
  ): Promise<WeeklyCheckpoint> {
    return fetchApi<WeeklyCheckpoint>('/api/checkpoints', {
      method: 'POST',
      body: JSON.stringify({ goalId, weekNumber, weekStartDate, title, targetDescription }),
    });
  },

  async updateCheckpoint(id: string, updates: Partial<WeeklyCheckpoint>): Promise<WeeklyCheckpoint> {
    return fetchApi<WeeklyCheckpoint>(`/api/checkpoints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteCheckpoint(id: string): Promise<void> {
    await fetchApi<any>(`/api/checkpoints/${id}`, { method: 'DELETE' });
  },

  // Daily Tasks
  async getTasks(): Promise<DailyTask[]> {
    return fetchApi<DailyTask[]>('/api/tasks');
  },

  async createTask(task: {
    title: string;
    description?: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    dueDate: string;
    estimatedMinutes?: number;
    checkpointId?: string;
  }): Promise<DailyTask> {
    return fetchApi<DailyTask>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async updateTask(id: string, updates: Partial<DailyTask>): Promise<DailyTask> {
    return fetchApi<DailyTask>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async toggleTaskDone(id: string): Promise<DailyTask> {
    return fetchApi<DailyTask>(`/api/tasks/${id}/done`, {
      method: 'PATCH',
    });
  },

  async deleteTask(id: string): Promise<void> {
    await fetchApi<any>(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  // AI Task Generation
  async generateAiTasks(payload: {
    goalTitle: string;
    goalDescription?: string;
    checkpointTitle: string;
    checkpointDescription?: string;
    weekStartDate: string;
    checkpointId?: string;
  }): Promise<{ tasks: Array<{
    checkpointId?: string;
    day: string;
    title: string;
    description: string;
    estimatedMinutes: number;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    dueDate: string;
  }> }> {
    return fetchApi<{ tasks: any[] }>('/api/ai/generate-tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Bulk save generated tasks
  async bulkCreateTasks(tasks: Array<{
    checkpointId?: string;
    title: string;
    description?: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    dueDate: string;
    estimatedMinutes?: number;
  }>): Promise<DailyTask[]> {
    return fetchApi<DailyTask[]>('/api/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({ tasks }),
    });
  }
};
