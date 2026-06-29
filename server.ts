/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { dbOps, hashPassword, verifyPassword, createSession, destroySession } from './server/db';
import { authMiddleware, AuthenticatedRequest } from './server/authMiddleware';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse incoming JSON
  app.use(express.json());

  // Define API Routes first, BEFORE Vite middleware is attached.
  
  // ----------------------------------------------------
  // AUTHENTICATION ENDPOINTS
  // ----------------------------------------------------
  
  // POST /api/auth/register
  app.post('/api/auth/register', (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) {
        res.status(400).json({ error: 'Name, email, and password are required' });
        return;
      }

      const existingUser = dbOps.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email is already registered' });
        return;
      }

      const passwordHash = hashPassword(password);
      const user = dbOps.createUser(name, email, passwordHash);
      const token = createSession(user.id);

      res.status(201).json({
        token,
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Registration failed' });
    }
  });

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = dbOps.getUserByEmail(email);
      if (!user) {
        res.status(400).json({ error: 'Invalid email or password' });
        return;
      }

      const isCorrectPassword = verifyPassword(password, user.passwordHash);
      if (!isCorrectPassword) {
        res.status(400).json({ error: 'Invalid email or password' });
        return;
      }

      const token = createSession(user.id);
      res.status(200).json({
        token,
        user: { id: user.id, name: user.name, email: user.email }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Login failed' });
    }
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        destroySession(token);
      }
      res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Logout failed' });
    }
  });

  // ----------------------------------------------------
  // GOAL ENDPOINTS (AUTH PROTECTED)
  // ----------------------------------------------------
  
  app.get('/api/goals', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const goal = dbOps.getActiveGoal(userId);
      res.status(200).json(goal); // will be the active goal object or null
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch goal' });
    }
  });

  app.get('/api/goals/all', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const goals = dbOps.getAllGoals(userId);
      res.status(200).json(goals);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch goals' });
    }
  });

  app.post('/api/goals/:id/activate', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const success = dbOps.activateGoal(id, userId);
      if (!success) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Goal activated successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to activate goal' });
    }
  });

  app.post('/api/goals', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { title, description, deadline } = req.body;
      if (!title || !deadline) {
        res.status(400).json({ error: 'Title and deadline are required' });
        return;
      }

      const goal = dbOps.createGoal(userId, title, description, deadline);
      res.status(201).json(goal);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to create goal' });
    }
  });

  app.put('/api/goals/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const updates = req.body;

      const updatedGoal = dbOps.updateGoal(id, userId, updates);
      if (!updatedGoal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.status(200).json(updatedGoal);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to update goal' });
    }
  });

  app.delete('/api/goals/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const success = dbOps.deleteGoal(id, userId);
      if (!success) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Goal deleted successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to delete goal' });
    }
  });

  // ----------------------------------------------------
  // WEEKLY CHECKPOINT ENDPOINTS (AUTH PROTECTED)
  // ----------------------------------------------------
  
  app.get('/api/checkpoints', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const goal = dbOps.getActiveGoal(userId);
      if (!goal) {
        res.status(200).json([]);
        return;
      }
      const checkpoints = dbOps.getCheckpoints(goal.id);
      res.status(200).json(checkpoints);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch checkpoints' });
    }
  });

  app.post('/api/checkpoints', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { goalId, weekNumber, weekStartDate, title, targetDescription } = req.body;
      
      if (!goalId || !weekNumber || !weekStartDate || !title) {
        res.status(400).json({ error: 'goalId, weekNumber, weekStartDate, and title are required' });
        return;
      }

      const checkpoint = dbOps.createCheckpoint(goalId, weekNumber, weekStartDate, title, targetDescription);
      res.status(201).json(checkpoint);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to create checkpoint' });
    }
  });

  app.put('/api/checkpoints/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = dbOps.updateCheckpoint(id, updates);
      if (!updated) {
        res.status(404).json({ error: 'Checkpoint not found' });
        return;
      }
      res.status(200).json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to update checkpoint' });
    }
  });

  app.delete('/api/checkpoints/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const success = dbOps.deleteCheckpoint(id);
      if (!success) {
        res.status(404).json({ error: 'Checkpoint not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Checkpoint deleted successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to delete checkpoint' });
    }
  });

  // ----------------------------------------------------
  // DAILY TASK ENDPOINTS (AUTH PROTECTED)
  // ----------------------------------------------------
  
  app.get('/api/tasks', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const tasks = dbOps.getAllTasks(userId);
      res.status(200).json(tasks);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch tasks' });
    }
  });

  app.get('/api/tasks/today', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const localTodayDate = new Date();
      // YYYY-MM-DD
      const dateStr = localTodayDate.toISOString().split('T')[0];
      const tasks = dbOps.getTasksByDay(userId, dateStr);
      res.status(200).json(tasks);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to fetch today\'s tasks' });
    }
  });

  app.post('/api/tasks', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { title, description, priority, dueDate, estimatedMinutes, checkpointId } = req.body;
      
      if (!title || !dueDate || !priority) {
        res.status(400).json({ error: 'Title, dueDate, and priority are required' });
        return;
      }

      const task = dbOps.createTask(userId, {
        checkpointId,
        title,
        description,
        priority,
        status: 'TODO',
        dueDate,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        isAiGenerated: false,
      });
      res.status(201).json(task);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to create task' });
    }
  });

  app.put('/api/tasks/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const updates = req.body;

      const updated = dbOps.updateTask(id, userId, updates);
      if (!updated) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.status(200).json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to update task' });
    }
  });

  app.patch('/api/tasks/:id/done', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const updated = dbOps.toggleTaskDone(id, userId);
      if (!updated) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.status(200).json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to toggle task' });
    }
  });

  app.delete('/api/tasks/:id', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { id } = req.params;
      const success = dbOps.deleteTask(id, userId);
      if (!success) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Task deleted successfully' });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to delete task' });
    }
  });

  // ----------------------------------------------------
  // BULK TASKS (AI bulk save)
  // ----------------------------------------------------
  app.post('/api/tasks/bulk', authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { tasks } = req.body;
      if (!tasks || !Array.isArray(tasks)) {
        res.status(400).json({ error: 'An array of tasks is required' });
        return;
      }

      const formattedTasks = tasks.map((t: any) => ({
        checkpointId: t.checkpointId || undefined,
        title: t.title,
        description: t.description || '',
        priority: t.priority || 'MEDIUM',
        status: 'TODO' as const,
        dueDate: t.dueDate,
        estimatedMinutes: t.estimatedMinutes ? Number(t.estimatedMinutes) : undefined,
        isAiGenerated: true,
      }));

      const createdTasks = dbOps.bulkCreateTasks(userId, formattedTasks);
      res.status(201).json(createdTasks);
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to save batch tasks' });
    }
  });

  // ----------------------------------------------------
  // GEMINI AI GENERATE ENDPOINT (AUTH PROTECTED)
  // ----------------------------------------------------
  app.post('/api/ai/generate-tasks', authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const {
        goalTitle,
        goalDescription,
        checkpointTitle,
        checkpointDescription,
        weekStartDate, // e.g. "2026-06-29"
        checkpointId,
      } = req.body;

      if (!goalTitle || !checkpointTitle || !weekStartDate) {
        res.status(400).json({ error: 'goalTitle, checkpointTitle, and weekStartDate are required' });
        return;
      }

      // Check for API key
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: 'Gemini API Key is not configured in Secrets. Please configure GEMINI_API_KEY in Settings.' });
        return;
      }

      // Instantiate the GoogleGenAI client as instructed in the skill
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Construct system instructions and prompt
      const systemInstruction = `Anda adalah asisten produktivitas bernama FocusFlow AI.
Tugas Anda adalah memecah tujuan besar (Main Goal) dan checkpoint mingguan (Weekly Checkpoint) menjadi 5 rencana kerja harian (Senin sampai Jumat) yang spesifik, realistis, dan actionable.
Selalu berikan output dalam format JSON yang valid mengikuti skema yang ditentukan, tanpa penjelasan atau penulisan teks tambahan di luar JSON.`;

      const userPrompt = `Main Goal saya: ${goalTitle} ${goalDescription ? `— ${goalDescription}` : ''}
Weekly Checkpoint minggu ini: ${checkpointTitle}
Target minggu ini: ${checkpointDescription || 'Fokus menyelesaikan checkpoint mingguan ini.'}

Buatkan 5 daily task spesifik untuk Senin s/d Jumat minggu ini (satu task per hari) yang akan membantu saya mencapai checkpoint dan goal tersebut secara bertahap.

Format JSON yang dihasilkan harus berupa object yang memiliki property "tasks" berupa array dengan 5 element. Setiap element merepresentasikan hari kerja dari Senin sampai Jumat secara berurutan.`;

      // Call Gemini 3.5-flash
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING, description: 'Nama hari: Senin, Selasa, Rabu, Kamis, atau Jumat' },
                    title: { type: Type.STRING, description: 'Judul daily task yang spesifik dan langsung dapat dikerjakan' },
                    description: { type: Type.STRING, description: 'Deskripsi singkat mengenai aksi nyata yang dilakukan' },
                    estimatedMinutes: { type: Type.INTEGER, description: 'Estimasi waktu pengerjaan dalam menit (misal: 30, 45, 60, 90)' },
                    priority: { type: Type.STRING, description: 'Tingkat prioritas task harian ini: HIGH atau MEDIUM atau LOW' },
                  },
                  required: ['day', 'title', 'priority'],
                },
              },
            },
            required: ['tasks'],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini API returned an empty response.');
      }

      const generatedJson = JSON.parse(responseText.trim());
      const rawTasks = generatedJson.tasks || [];

      // Map days of week (Senin-Jumat) to real calendar dates based on weekStartDate (which is the Monday)
      const startDate = new Date(weekStartDate);
      const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
      
      const mappedTasks = rawTasks.map((t: any) => {
        // Find index of day
        const dayIndex = daysOfWeek.findIndex(d => d.toLowerCase() === (t.day || '').toLowerCase());
        const finalIndex = dayIndex !== -1 ? dayIndex : 0;
        
        // Calculate date for that day
        const taskDate = new Date(startDate);
        taskDate.setDate(startDate.getDate() + finalIndex);
        const dueDate = taskDate.toISOString().split('T')[0];

        // Ensure valid priority
        let priority = 'MEDIUM';
        if (t.priority && ['HIGH', 'MEDIUM', 'LOW'].includes(t.priority.toUpperCase())) {
          priority = t.priority.toUpperCase();
        }

        return {
          checkpointId: checkpointId || undefined,
          day: daysOfWeek[finalIndex],
          title: t.title,
          description: t.description || '',
          estimatedMinutes: t.estimatedMinutes || 60,
          priority: priority,
          dueDate: dueDate,
        };
      });

      res.status(200).json({ tasks: mappedTasks });
    } catch (e: any) {
      console.error('Gemini error:', e);
      res.status(500).json({ error: e.message || 'AI generation failed' });
    }
  });

  // ----------------------------------------------------
  // VITE DEV SERVER AND STATIC FILE ROUTING
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Listen to Port 3000 (Required for Cloud Run)
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
