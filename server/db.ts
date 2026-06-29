/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, MainGoal, WeeklyCheckpoint, DailyTask } from '../src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface Schema {
  users: User[];
  goals: MainGoal[];
  checkpoints: WeeklyCheckpoint[];
  tasks: DailyTask[];
  sessions: { token: string; userId: string; expiresAt: number }[];
}

const initialSchema: Schema = {
  users: [],
  goals: [],
  checkpoints: [],
  tasks: [],
  sessions: [],
};

// Ensure database file exists
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), 'utf-8');
  } else {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      JSON.parse(content);
    } catch (e) {
      // Re-init if corrupted
      fs.writeFileSync(DB_FILE, JSON.stringify(initialSchema, null, 2), 'utf-8');
    }
  }
}

initDb();

// Read and write lock helpers
function readDb(): Schema {
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return initialSchema;
  }
}

function writeDb(data: Schema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Password Hashing
export function hashPassword(password: string): string {
  // We store salt and hash together in salt:hash format
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedValue: string): boolean {
  if (!storedValue || !storedValue.includes(':')) return false;
  const [salt, originalHash] = storedValue.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Session Token Management
export function createSession(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const db = readDb();
  // 7 days expiration as per NFR
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  
  db.sessions.push({ token, userId, expiresAt });
  writeDb(db);
  return token;
}

export function validateSession(token: string): string | null {
  if (!token) return null;
  const db = readDb();
  const sessionIndex = db.sessions.findIndex(s => s.token === token);
  if (sessionIndex === -1) return null;
  
  const session = db.sessions[sessionIndex];
  if (session.expiresAt < Date.now()) {
    // Delete expired session
    db.sessions.splice(sessionIndex, 1);
    writeDb(db);
    return null;
  }
  return session.userId;
}

export function destroySession(token: string): void {
  const db = readDb();
  db.sessions = db.sessions.filter(s => s.token !== token);
  writeDb(db);
}

// Core Database Methods
export const dbOps = {
  // Users
  createUser(name: string, email: string, passwordHash: string): User {
    const db = readDb();
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    writeDb(db);
    return newUser;
  },

  getUserByEmail(email: string): User | null {
    const db = readDb();
    const user = db.users.find(u => u.email === email.toLowerCase());
    return user || null;
  },

  getUserById(id: string): User | null {
    const db = readDb();
    const user = db.users.find(u => u.id === id);
    return user || null;
  },

  // Auto calculate progress of the goal
  recalculateGoalProgress(userId: string, db: Schema): Schema {
    const activeGoalIndex = db.goals.findIndex(g => g.userId === userId && g.isActive);
    if (activeGoalIndex !== -1) {
      const activeGoal = db.goals[activeGoalIndex];
      const userTasks = db.tasks.filter(t => t.userId === userId);
      if (userTasks.length > 0) {
        const completedTasks = userTasks.filter(t => t.status === 'DONE').length;
        activeGoal.progress = Math.round((completedTasks / userTasks.length) * 100);
      } else {
        activeGoal.progress = 0;
      }
    }
    return db;
  },

  // Goals
  getActiveGoal(userId: string): MainGoal | null {
    const db = readDb();
    const goal = db.goals.find(g => g.userId === userId && g.isActive);
    if (goal) {
      // Recalculate progress dynamically to be safe
      const goalCheckpoints = db.checkpoints.filter(cp => cp.goalId === goal.id);
      const checkpointIds = goalCheckpoints.map(cp => cp.id);
      const goalTasks = db.tasks.filter(t => t.userId === userId && t.checkpointId && checkpointIds.includes(t.checkpointId));
      
      if (goalTasks.length > 0) {
        const completedTasks = goalTasks.filter(t => t.status === 'DONE').length;
        goal.progress = Math.round((completedTasks / goalTasks.length) * 100);
      } else {
        const userTasks = db.tasks.filter(t => t.userId === userId);
        if (userTasks.length > 0) {
          const completedTasks = userTasks.filter(t => t.status === 'DONE').length;
          goal.progress = Math.round((completedTasks / userTasks.length) * 100);
        } else {
          goal.progress = 0;
        }
      }
    }
    return goal || null;
  },

  getAllGoals(userId: string): MainGoal[] {
    const db = readDb();
    const userGoals = db.goals.filter(g => g.userId === userId);
    
    userGoals.forEach(goal => {
      const goalCheckpoints = db.checkpoints.filter(cp => cp.goalId === goal.id);
      const checkpointIds = goalCheckpoints.map(cp => cp.id);
      const goalTasks = db.tasks.filter(t => t.userId === userId && t.checkpointId && checkpointIds.includes(t.checkpointId));
      
      if (goalTasks.length > 0) {
        const completedTasks = goalTasks.filter(t => t.status === 'DONE').length;
        goal.progress = Math.round((completedTasks / goalTasks.length) * 100);
      } else {
        if (goal.isActive) {
          const userTasks = db.tasks.filter(t => t.userId === userId);
          if (userTasks.length > 0) {
            const completedTasks = userTasks.filter(t => t.status === 'DONE').length;
            goal.progress = Math.round((completedTasks / userTasks.length) * 100);
          } else {
            goal.progress = 0;
          }
        } else {
          goal.progress = 0;
        }
      }
    });
    
    // Sort so newest created are shown first
    return userGoals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  activateGoal(id: string, userId: string): boolean {
    const db = readDb();
    const goalExists = db.goals.some(g => g.id === id && g.userId === userId);
    if (!goalExists) return false;
    
    db.goals = db.goals.map(g => {
      if (g.userId === userId) {
        return { ...g, isActive: g.id === id };
      }
      return g;
    });
    
    writeDb(db);
    return true;
  },

  createGoal(userId: string, title: string, description: string | undefined, deadline: string): MainGoal {
    let db = readDb();
    // Deactivate all existing goals for this user (User can only have 1 active goal)
    db.goals = db.goals.map(g => {
      if (g.userId === userId) {
        return { ...g, isActive: false };
      }
      return g;
    });

    const newGoal: MainGoal = {
      id: crypto.randomUUID(),
      userId,
      title,
      description,
      deadline,
      progress: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    db.goals.push(newGoal);
    writeDb(db);
    return newGoal;
  },

  updateGoal(id: string, userId: string, updates: Partial<MainGoal>): MainGoal | null {
    let db = readDb();
    const goalIndex = db.goals.findIndex(g => g.id === id && g.userId === userId);
    if (goalIndex === -1) return null;

    db.goals[goalIndex] = {
      ...db.goals[goalIndex],
      ...updates,
    };

    db = this.recalculateGoalProgress(userId, db);
    writeDb(db);
    return db.goals[goalIndex];
  },

  deleteGoal(id: string, userId: string): boolean {
    let db = readDb();
    const beforeLength = db.goals.length;
    // Delete the goal
    db.goals = db.goals.filter(g => !(g.id === id && g.userId === userId));
    // Also cascade delete related checkpoints
    db.checkpoints = db.checkpoints.filter(cp => cp.goalId !== id);
    
    if (db.goals.length !== beforeLength) {
      writeDb(db);
      return true;
    }
    return false;
  },

  // Checkpoints
  getCheckpoints(goalId: string): WeeklyCheckpoint[] {
    const db = readDb();
    return db.checkpoints.filter(cp => cp.goalId === goalId);
  },

  createCheckpoint(goalId: string, weekNumber: number, weekStartDate: string, title: string, targetDescription?: string): WeeklyCheckpoint {
    const db = readDb();
    const newCheckpoint: WeeklyCheckpoint = {
      id: crypto.randomUUID(),
      goalId,
      weekNumber,
      weekStartDate,
      title,
      targetDescription,
      status: 'NOT_STARTED',
      createdAt: new Date().toISOString(),
    };
    db.checkpoints.push(newCheckpoint);
    writeDb(db);
    return newCheckpoint;
  },

  updateCheckpoint(id: string, updates: Partial<WeeklyCheckpoint>): WeeklyCheckpoint | null {
    const db = readDb();
    const index = db.checkpoints.findIndex(cp => cp.id === id);
    if (index === -1) return null;

    db.checkpoints[index] = {
      ...db.checkpoints[index],
      ...updates,
    };
    writeDb(db);
    return db.checkpoints[index];
  },

  deleteCheckpoint(id: string): boolean {
    const db = readDb();
    const beforeLength = db.checkpoints.length;
    db.checkpoints = db.checkpoints.filter(cp => cp.id !== id);
    // Also disconnect daily tasks by setting checkpointId to null
    db.tasks = db.tasks.map(t => {
      if (t.checkpointId === id) {
        return { ...t, checkpointId: undefined };
      }
      return t;
    });

    if (db.checkpoints.length !== beforeLength) {
      writeDb(db);
      return true;
    }
    return false;
  },

  // Tasks
  getTasksByWeek(userId: string, weekStartDate: string, weekEndDate: string): DailyTask[] {
    const db = readDb();
    // Filter tasks that fall between weekStartDate and weekEndDate (YYYY-MM-DD)
    return db.tasks.filter(t => t.userId === userId && t.dueDate >= weekStartDate && t.dueDate <= weekEndDate);
  },

  getTasksByDay(userId: string, date: string): DailyTask[] {
    const db = readDb();
    return db.tasks.filter(t => t.userId === userId && t.dueDate === date);
  },

  getAllTasks(userId: string): DailyTask[] {
    const db = readDb();
    return db.tasks.filter(t => t.userId === userId);
  },

  createTask(userId: string, task: Omit<DailyTask, 'id' | 'userId' | 'createdAt'>): DailyTask {
    let db = readDb();
    const newTask: DailyTask = {
      ...task,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    };
    db.tasks.push(newTask);
    db = this.recalculateGoalProgress(userId, db);
    writeDb(db);
    return newTask;
  },

  updateTask(id: string, userId: string, updates: Partial<DailyTask>): DailyTask | null {
    let db = readDb();
    const index = db.tasks.findIndex(t => t.id === id && t.userId === userId);
    if (index === -1) return null;

    db.tasks[index] = {
      ...db.tasks[index],
      ...updates,
    };
    db = this.recalculateGoalProgress(userId, db);
    writeDb(db);
    return db.tasks[index];
  },

  toggleTaskDone(id: string, userId: string): DailyTask | null {
    let db = readDb();
    const index = db.tasks.findIndex(t => t.id === id && t.userId === userId);
    if (index === -1) return null;

    db.tasks[index].status = db.tasks[index].status === 'TODO' ? 'DONE' : 'TODO';
    db = this.recalculateGoalProgress(userId, db);
    writeDb(db);
    return db.tasks[index];
  },

  deleteTask(id: string, userId: string): boolean {
    let db = readDb();
    const beforeLength = db.tasks.length;
    db.tasks = db.tasks.filter(t => !(t.id === id && t.userId === userId));
    if (db.tasks.length !== beforeLength) {
      db = this.recalculateGoalProgress(userId, db);
      writeDb(db);
      return true;
    }
    return false;
  },

  bulkCreateTasks(userId: string, tasks: Omit<DailyTask, 'id' | 'userId' | 'createdAt'>[]): DailyTask[] {
    let db = readDb();
    const createdTasks: DailyTask[] = tasks.map(t => ({
      ...t,
      id: crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    }));
    
    db.tasks.push(...createdTasks);
    db = this.recalculateGoalProgress(userId, db);
    writeDb(db);
    return createdTasks;
  },
};
