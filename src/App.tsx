/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, Calendar, CheckSquare, Settings, Sparkles, 
  ArrowRight, Mail, Lock, User as UserIcon, Plus, CheckCircle2, 
  Clock, AlertCircle, Trash2, Edit, PlayCircle, Circle, LogOut, RefreshCcw
} from 'lucide-react';

import { api, setToken, getToken } from './api';
import { MainGoal, WeeklyCheckpoint, DailyTask } from './types';

// Component Imports
import Navbar from './components/Navbar';
import GoalCard from './components/GoalCard';
import CheckpointTimeline from './components/CheckpointTimeline';
import WeeklyCalendar from './components/WeeklyCalendar';
import AIGenerateModal from './components/AIGenerateModal';
import GoalModal from './components/GoalModal';
import CheckpointModal from './components/CheckpointModal';
import TaskModal from './components/TaskModal';

// Helper to get Monday of any date
function getMondayOfDate(d: Date): Date {
  const dateCopy = new Date(d);
  const day = dateCopy.getDay();
  const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday (0)
  const monday = new Date(dateCopy.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function App() {
  // Authentication State
  const [token, setTokenState] = useState<string>(getToken());
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  
  // App Pages
  const [activePage, setActivePage] = useState<string>('dashboard');
  
  // Data States
  const [activeGoal, setActiveGoal] = useState<MainGoal | null>(null);
  const [allGoals, setAllGoals] = useState<MainGoal[]>([]);
  const [checkpoints, setCheckpoints] = useState<WeeklyCheckpoint[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Edit / Add Cache State
  const [goalToEdit, setGoalToEdit] = useState<MainGoal | null>(null);
  const [checkpointToEdit, setCheckpointToEdit] = useState<WeeklyCheckpoint | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<DailyTask | null>(null);
  const [taskDefaultDate, setTaskDefaultDate] = useState<string>('');

  // Calendar State
  const [currentWeekStartDate, setCurrentWeekStartDate] = useState<Date>(getMondayOfDate(new Date()));

  // On Mount: Load user if token exists in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('focusflow_user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  // Load App Data when authenticated
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    setIsLoadingData(true);
    try {
      const goalData = await api.getActiveGoal();
      setActiveGoal(goalData);

      const allGoalsData = await api.getAllGoals();
      setAllGoals(allGoalsData);

      if (goalData) {
        const cps = await api.getCheckpoints();
        setCheckpoints(cps);
      } else {
        setCheckpoints([]);
      }

      const tasksData = await api.getTasks();
      setTasks(tasksData);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setTokenState('');
    setUser(null);
    setActivePage('dashboard');
  };

  const handleLoginSuccess = (token: string, userInfo: { id: string; name: string; email: string }) => {
    setToken(token);
    setTokenState(token);
    setUser(userInfo);
    localStorage.setItem('focusflow_user', JSON.stringify(userInfo));
  };

  // ----------------------------------------------------
  // MUTATION HANDLERS
  // ----------------------------------------------------
  
  // Goal CRUD
  const handleGoalSubmit = async (title: string, description: string, deadline: string) => {
    if (goalToEdit) {
      await api.updateGoal(goalToEdit.id, { title, description, deadline });
    } else {
      await api.createGoal(title, description, deadline);
    }
    await loadAllData();
  };

  const handleDeleteGoal = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus Goal ini? Semua checkpoints terkait juga akan ikut terhapus.')) {
      await api.deleteGoal(id);
      await loadAllData();
    }
  };

  const handleActivateGoal = async (id: string) => {
    try {
      await api.activateGoal(id);
      await loadAllData();
    } catch (e) {
      console.error('Failed to activate goal', e);
    }
  };

  // Checkpoint CRUD
  const handleCheckpointSubmit = async (
    weekNumber: number,
    weekStartDate: string,
    title: string,
    targetDescription?: string,
    status?: any
  ) => {
    if (!activeGoal) return;
    if (checkpointToEdit) {
      await api.updateCheckpoint(checkpointToEdit.id, {
        weekNumber,
        weekStartDate,
        title,
        targetDescription,
        status,
      });
    } else {
      await api.createCheckpoint(activeGoal.id, weekNumber, weekStartDate, title, targetDescription);
    }
    await loadAllData();
  };

  const handleUpdateCheckpointStatus = async (id: string, currentStatus: any) => {
    const nextStatusMap: { [key: string]: any } = {
      NOT_STARTED: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE: 'NOT_STARTED',
    };
    const nextStatus = nextStatusMap[currentStatus] || 'NOT_STARTED';
    await api.updateCheckpoint(id, { status: nextStatus });
    await loadAllData();
  };

  const handleDeleteCheckpoint = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus checkpoint mingguan ini?')) {
      await api.deleteCheckpoint(id);
      await loadAllData();
    }
  };

  // Daily Tasks CRUD
  const handleTaskSubmit = async (taskPayload: {
    title: string;
    description?: string;
    priority: any;
    dueDate: string;
    estimatedMinutes?: number;
    checkpointId?: string;
  }) => {
    if (taskToEdit) {
      await api.updateTask(taskToEdit.id, taskPayload);
    } else {
      await api.createTask(taskPayload);
    }
    await loadAllData();
  };

  const handleToggleTask = async (id: string) => {
    await api.toggleTaskDone(id);
    await loadAllData();
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus tugas harian ini?')) {
      await api.deleteTask(id);
      await loadAllData();
    }
  };

  const handleTriggerEditGoal = (goal: MainGoal) => {
    setGoalToEdit(goal);
    setIsGoalModalOpen(true);
  };

  const handleTriggerEditCheckpoint = (cp: WeeklyCheckpoint) => {
    setCheckpointToEdit(cp);
    setIsCheckpointModalOpen(true);
  };

  const handleTriggerEditTask = (task: DailyTask) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleTriggerAddTask = (dueDate: string) => {
    setTaskToEdit(null);
    setTaskDefaultDate(dueDate);
    setIsTaskModalOpen(true);
  };

  // If NOT authenticated, render the Auth Page
  if (!user || !token) {
    return <AuthPage onAuthSuccess={handleLoginSuccess} />;
  }

  // Calculate calendar metrics for current day display
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => t.dueDate === todayDateStr);
  const doneTodayCount = todayTasks.filter(t => t.status === 'DONE').length;

  return (
    <div id="focusflow-app" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      
      {/* Side / Top Navigation Bar */}
      <Navbar 
        activePage={activePage} 
        onPageChange={setActivePage} 
        user={user} 
        onLogout={handleLogout} 
      />

      {/* Main Content Area */}
      <main id="app-main-viewport" className="flex-1 md:ml-64 p-4 md:p-8 pt-6 pb-24 md:pb-8 min-h-screen flex flex-col justify-between">
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 max-w-7xl mx-auto w-full flex-1"
          >
            
            {/* ----------------------------------------------------
                1. DASHBOARD VIEW
                ---------------------------------------------------- */}
            {activePage === 'dashboard' && (
              <div id="dashboard-view" className="space-y-6">
                
                {/* Header Greeting Banner */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h1 className="font-serif font-bold text-2xl md:text-3xl tracking-tight text-white">
                      Semangat pagi, {user.name}! 👋
                    </h1>
                    <p className="text-white/60 text-xs md:text-sm font-medium mt-1">
                      Mari selesaikan checkpoint mingguan Anda hari ini menggunakan aksi-aksi kecil harian.
                    </p>
                  </div>
                  
                  {/* Refresh Button */}
                  <button 
                    id="btn-refresh-dashboard"
                    onClick={loadAllData} 
                    className="p-2 bg-[#141415] border border-white/10 hover:border-white/20 text-white/60 hover:text-white rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 text-white/40" />
                    Perbarui Data
                  </button>
                </div>

                {/* Dashboard Grid (Bento Style) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Col 1: Active Goal Progress */}
                  <div className="lg:col-span-1 flex flex-col justify-stretch">
                    <GoalCard 
                      goal={activeGoal} 
                      onEdit={() => handleTriggerEditGoal(activeGoal!)} 
                      onNavigateToGoals={() => setActivePage('goals')}
                    />
                  </div>

                  {/* Col 2: Checkpoints Timeline snapshot */}
                  <div className="lg:col-span-1 flex flex-col justify-stretch">
                    <CheckpointTimeline 
                      checkpoints={checkpoints}
                      onUpdateStatus={handleUpdateCheckpointStatus}
                      onEdit={handleTriggerEditCheckpoint}
                      onDelete={handleDeleteCheckpoint}
                      onAddClick={() => {
                        setCheckpointToEdit(null);
                        setIsCheckpointModalOpen(true);
                      }}
                    />
                  </div>

                  {/* Col 3: Today's Tasks Highlight list */}
                  <div className="lg:col-span-1 flex flex-col justify-between bg-[#141415] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-5 h-5 text-emerald-400" />
                          <h3 className="font-sans font-bold text-base text-white">Hari Ini ({todayTasks.length})</h3>
                        </div>
                        {todayTasks.length > 0 && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                            {doneTodayCount}/{todayTasks.length} DONE
                          </span>
                        )}
                      </div>

                      {/* Tasks scrollable container */}
                      <div className="space-y-3 overflow-y-auto max-h-[220px]">
                        {todayTasks.length === 0 ? (
                          <div className="text-center py-10 text-white/40 text-xs flex flex-col items-center justify-center">
                            <Clock className="w-8 h-8 text-white/10 mb-2" />
                            <span>Tidak ada tugas dijadwalkan untuk hari ini.</span>
                            <button
                              id="btn-shortcut-add-task-today"
                              onClick={() => handleTriggerAddTask(todayDateStr)}
                              className="mt-3 text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" /> Tambah Task Sekarang
                            </button>
                          </div>
                        ) : (
                          todayTasks.map(task => (
                            <div
                              id={`dashboard-today-task-${task.id}`}
                              key={task.id}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                                task.status === 'DONE' 
                                  ? 'bg-white/2 border-white/5 opacity-50' 
                                  : 'bg-white/5 hover:bg-white/10 border-white/10 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  id={`btn-dash-toggle-task-${task.id}`}
                                  onClick={() => handleToggleTask(task.id)}
                                  className="text-white/40 hover:text-emerald-400 mt-0.5 shrink-0 cursor-pointer"
                                >
                                  {task.status === 'DONE' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <div className="w-4 h-4 rounded border border-white/20" />
                                  )}
                                </button>
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold truncate ${task.status === 'DONE' ? 'line-through text-white/40' : 'text-white'}`}>
                                    {task.title}
                                  </p>
                                  <span className="text-[9px] font-mono font-medium text-white/40">
                                    {task.estimatedMinutes || 60} menit • {task.priority}
                                  </span>
                                </div>
                              </div>
                              
                              {task.isAiGenerated && (
                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0">
                                  AI
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Generate Trigger block at bottom */}
                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                      <span className="text-[10px] text-white/40 font-mono font-medium">BINGUNG MULAI HARI ANDA?</span>
                      <button
                        id="btn-trigger-ai-dash"
                        onClick={() => setIsAiModalOpen(true)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-emerald-400 hover:from-indigo-600 hover:to-emerald-500 text-black font-bold text-[10px] uppercase rounded-lg transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        Generate AI Tasks
                      </button>
                    </div>

                  </div>

                </div>

                {/* Bottom Quick Calendar Overview */}
                <WeeklyCalendar
                  tasks={tasks}
                  checkpoints={checkpoints}
                  currentWeekStartDate={currentWeekStartDate}
                  onWeekChange={setCurrentWeekStartDate}
                  onToggleTask={handleToggleTask}
                  onEditTask={handleTriggerEditTask}
                  onDeleteTask={handleDeleteTask}
                  onAddTask={handleTriggerAddTask}
                  onTriggerAi={() => setIsAiModalOpen(true)}
                  isAiGenerating={false}
                />

              </div>
            )}

            {/* ----------------------------------------------------
                2. GOALS VIEW
                ---------------------------------------------------- */}
            {activePage === 'goals' && (
              <div id="goals-view" className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h1 className="font-serif font-bold text-2xl md:text-3xl tracking-tight text-white flex items-center gap-2.5">
                      <Target className="w-6 h-6 text-emerald-400" />
                      Manajemen Goal Utama
                    </h1>
                    <p className="text-white/60 text-xs sm:text-sm font-medium mt-1">
                      Tetapkan tujuan besar Anda. Klik "Aktifkan" pada goal pilihan Anda untuk fokus mengerjakan checkpoints & daily tasks goal tersebut.
                    </p>
                  </div>

                  <button
                    id="btn-create-new-goal-tab"
                    onClick={() => {
                      setGoalToEdit(null);
                      setIsGoalModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-white/90 text-black font-semibold text-xs rounded-xl transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Buat Goal Baru
                  </button>
                </div>

                {allGoals.length === 0 ? (
                  <div className="bg-[#141415] border border-dashed border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-2xl mx-auto min-h-[300px]">
                    <Target className="w-12 h-12 text-emerald-400/50 mb-4" />
                    <h2 className="font-serif font-bold text-xl text-white">Belum Ada Goal Terdaftar</h2>
                    <p className="text-white/60 text-sm max-w-md mt-1.5 mb-6">
                      Mulai kesuksesan Anda hari ini dengan menetapkan satu target pencapaian utama di FocusFlow.
                    </p>
                    <button
                      id="btn-create-first-goal-tab"
                      onClick={() => {
                        setGoalToEdit(null);
                        setIsGoalModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-white/90 text-black font-semibold text-xs rounded-xl transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Buat Main Goal Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Active Goal Showcase (if any) */}
                    {activeGoal ? (
                      <div className="space-y-4">
                        <h3 className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Goal Aktif Saat Ini
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2 space-y-4">
                            <div className="bg-[#141415] border border-emerald-500/30 rounded-3xl p-6 md:p-8 relative overflow-hidden space-y-6 shadow-lg shadow-emerald-500/2">
                              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                              <div className="flex items-center justify-between gap-4">
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-wider uppercase">
                                  MAIN GOAL AKTIF
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    id="btn-edit-main-goal"
                                    onClick={() => handleTriggerEditGoal(activeGoal)}
                                    className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-white/10"
                                  >
                                    <Edit className="w-3.5 h-3.5 text-white/60" />
                                    Edit Goal
                                  </button>
                                  <button
                                    id="btn-delete-main-goal"
                                    onClick={() => handleDeleteGoal(activeGoal.id)}
                                    className="p-2 bg-white/5 hover:bg-white/10 text-rose-400 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-white/10"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400/80" />
                                    Hapus Goal
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <h2 className="font-serif font-bold text-2xl md:text-3xl text-white tracking-tight">{activeGoal.title}</h2>
                                {activeGoal.description ? (
                                  <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{activeGoal.description}</p>
                                ) : (
                                  <p className="text-white/40 text-xs italic">Tidak ada deskripsi ditambahkan.</p>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-5 text-xs">
                                <div>
                                  <span className="text-white/40 block uppercase font-bold tracking-wider mb-1">Dibuat Tanggal</span>
                                  <p className="text-white/80 font-medium font-mono">
                                    {new Date(activeGoal.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-white/40 block uppercase font-bold tracking-wider mb-1">Target Deadline</span>
                                  <p className="text-white/80 font-medium font-mono">
                                    {new Date(activeGoal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Progress Stats Container */}
                            <div className="bg-[#141415] border border-white/10 rounded-3xl p-6 grid grid-cols-3 gap-4 text-center">
                              <div className="border-r border-white/5">
                                <span className="text-white/40 text-[10px] font-mono font-bold block uppercase tracking-wider">TOTAL TASKS</span>
                                <span className="font-sans font-extrabold text-2xl text-white block mt-1">{tasks.length}</span>
                              </div>
                              <div className="border-r border-white/5">
                                <span className="text-white/40 text-[10px] font-mono font-bold block uppercase tracking-wider">TASKS COMPLETED</span>
                                <span className="font-sans font-extrabold text-2xl text-emerald-400 block mt-1">
                                  {tasks.filter(t => t.status === 'DONE').length}
                                </span>
                              </div>
                              <div>
                                <span className="text-white/40 text-[10px] font-mono font-bold block uppercase tracking-wider">WEEKLY CHECKPOINTS</span>
                                <span className="font-sans font-extrabold text-2xl text-indigo-400 block mt-1">{checkpoints.length}</span>
                              </div>
                            </div>
                          </div>

                          <div className="lg:col-span-1">
                            <GoalCard 
                              goal={activeGoal} 
                              onEdit={() => handleTriggerEditGoal(activeGoal)} 
                              onNavigateToGoals={() => {}}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 text-center text-amber-400 text-sm">
                        Anda memiliki goal terdaftar, namun belum ada goal yang aktif. Silakan pilih dan aktifkan salah satu goal di bawah ini untuk memulai.
                      </div>
                    )}

                    {/* All Goals Directory List */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-bold text-lg text-white">
                          Daftar Seluruh Goal ({allGoals.length})
                        </h3>
                        <span className="text-xs text-white/40">
                          Klik "Aktifkan Goal" untuk berpindah fokus
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allGoals.map((goal) => {
                          const isCurrentActive = activeGoal?.id === goal.id;
                          const deadlineDate = new Date(goal.deadline);
                          const today = new Date();
                          const timeDiff = deadlineDate.getTime() - today.getTime();
                          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                          const isOverdue = daysDiff < 0;

                          return (
                            <div
                              key={goal.id}
                              className={`bg-[#141415] rounded-2xl p-6 border relative overflow-hidden flex flex-col justify-between transition group hover:border-white/20 ${
                                isCurrentActive
                                  ? 'border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/2'
                                  : 'border-white/10'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  {isCurrentActive ? (
                                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-wider uppercase flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      AKTIF
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleActivateGoal(goal.id)}
                                      className="bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/5 group-hover:border-white/10 text-white/70 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold tracking-wider uppercase transition cursor-pointer"
                                    >
                                      Aktifkan Goal
                                    </button>
                                  )}

                                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                                    <button
                                      onClick={() => handleTriggerEditGoal(goal)}
                                      className="p-1 hover:bg-white/5 text-white/50 hover:text-white rounded-md transition cursor-pointer"
                                      title="Edit Goal"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteGoal(goal.id)}
                                      className="p-1 hover:bg-white/5 text-white/50 hover:text-rose-400 rounded-md transition cursor-pointer"
                                      title="Hapus Goal"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <h4 className="font-serif font-bold text-lg text-white mb-1.5 group-hover:text-emerald-400 transition">
                                  {goal.title}
                                </h4>
                                {goal.description && (
                                  <p className="text-white/60 text-xs line-clamp-2 mb-4 leading-relaxed">
                                    {goal.description}
                                  </p>
                                )}
                              </div>

                              <div className="space-y-3 pt-3 border-t border-white/5">
                                {/* Progress track */}
                                <div>
                                  <div className="flex items-center justify-between text-[10px] mb-1">
                                    <span className="text-white/40">PROGRESS</span>
                                    <span className="font-mono font-bold text-emerald-400">{goal.progress}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                                      style={{ width: `${goal.progress}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center justify-between text-[10px] text-white/40">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-white/20" />
                                    <span>
                                      {new Date(goal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                    </span>
                                  </div>
                                  <span className={isOverdue ? 'text-rose-400 font-medium' : ''}>
                                    {isOverdue ? 'Overdue' : `${daysDiff} hari lagi`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------------------------------------------
                3. WEEKLY PLAN VIEW
                ---------------------------------------------------- */}
            {activePage === 'weekly' && (
              <div id="weekly-view" className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h1 className="font-serif font-bold text-2xl tracking-tight text-white flex items-center gap-2.5">
                      <Calendar className="w-6 h-6 text-emerald-400" />
                      Rencana Mingguan (Weekly Plan)
                    </h1>
                    <p className="text-white/60 text-xs sm:text-sm font-medium mt-1">
                      Susun target mingguan untuk memecah tujuan besar Anda. Klik status checkpoint untuk mengubah kemajuan pengerjaan.
                    </p>
                  </div>

                  {activeGoal && (
                    <button
                      id="btn-add-checkpoint-tab"
                      onClick={() => {
                        setCheckpointToEdit(null);
                        setIsCheckpointModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#141415] border border-white/10 hover:border-white/20 text-emerald-400 hover:text-emerald-300 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Checkpoint
                    </button>
                  )}
                </div>

                {!activeGoal ? (
                  <div className="bg-[#141415] border border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center max-w-lg mx-auto min-h-[220px]">
                    <Target className="w-10 h-10 text-emerald-400 mb-3" />
                    <h3 className="font-serif font-bold text-white text-lg">Butuh Goal Aktif</h3>
                    <p className="text-white/60 text-xs mt-1 mb-5 leading-relaxed">
                      Anda harus membuat Main Goal terlebih dahulu sebelum bisa mendefinisikan rencana mingguan.
                    </p>
                    <button
                      id="btn-redirect-to-goals"
                      onClick={() => setActivePage('goals')}
                      className="px-4 py-2 bg-white hover:bg-white/90 text-black font-semibold text-xs rounded-xl transition cursor-pointer"
                    >
                      Buat Goal Sekarang
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <CheckpointTimeline
                        checkpoints={checkpoints}
                        onUpdateStatus={handleUpdateCheckpointStatus}
                        onEdit={handleTriggerEditCheckpoint}
                        onDelete={handleDeleteCheckpoint}
                        onAddClick={() => {
                          setCheckpointToEdit(null);
                          setIsCheckpointModalOpen(true);
                        }}
                      />
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      {/* AI Generator Promo Card */}
                      <div className="bg-gradient-to-br from-[#141415] to-[#0A0A0A] border border-white/10 rounded-3xl p-6 relative overflow-hidden flex flex-col sm:flex-row gap-5 items-center justify-between shadow-xl">
                        {/* decorative background glow */}
                        <div className="absolute inset-0 bg-emerald-500/2 blur-xl rounded-full" />
                        
                        <div className="space-y-2 relative">
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <Sparkles className="w-5 h-5" />
                            <span className="text-xs font-mono font-bold tracking-widest uppercase">FocusFlow AI Planner</span>
                          </div>
                          <h3 className="font-serif font-bold text-lg text-white">Rencanakan Hari Kerja dalam Hitungan Detik</h3>
                          <p className="text-white/60 text-xs leading-relaxed max-w-md">
                            Cukup tentukan target checkpoint mingguan, lalu biarkan asisten Gemini AI merancang 5 rencana aksi nyata dari Senin s/d Jumat agar target Anda tercapai terstruktur.
                          </p>
                        </div>

                        <button
                          id="btn-trigger-ai-promo"
                          onClick={() => setIsAiModalOpen(true)}
                          disabled={checkpoints.length === 0}
                          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-emerald-400 hover:from-indigo-600 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs rounded-xl transition shrink-0 relative cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          ✨ Generate Rencana AI
                        </button>
                      </div>

                      {/* Instructions Card */}
                      <div className="bg-[#141415] border border-white/10 rounded-3xl p-6 space-y-4">
                        <h4 className="font-serif font-bold text-white text-sm">Bagaimana menyusun Weekly Plan?</h4>
                        <ol className="text-xs text-white/60 space-y-3 pl-4 list-decimal leading-relaxed">
                          <li>
                            <strong className="text-white">Buat Checkpoint Terlebih Dahulu:</strong> Definisikan target spesifik untuk minggu ini. Misalnya "Minggu 1: Selesaikan wireframe desain dan skema database".
                          </li>
                          <li>
                            <strong className="text-white">Gunakan AI untuk Menghasilkan Tugas:</strong> Klik tombol AI Generator. AI akan memilah checkpoint Anda menjadi 5 tugas kecil Senin-Jumat.
                          </li>
                          <li>
                            <strong className="text-white">Evaluasi Rencana Harian:</strong> Tinjau tugas dari AI, lakukan edit seperlunya, lalu simpan ke kalender Anda.
                          </li>
                          <li>
                            <strong className="text-white">Ubah Status Mingguan:</strong> Setelah seluruh tugas harian selesai, klik badge status pada checkpoint untuk mengubahnya menjadi <span className="text-emerald-400 font-semibold">Done</span>.
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------------------------------------------
                4. DAILY TASKS / CALENDAR VIEW
                ---------------------------------------------------- */}
            {activePage === 'daily' && (
              <div id="daily-view" className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h1 className="font-serif font-bold text-2xl tracking-tight text-white flex items-center gap-2.5">
                      <CheckSquare className="w-6 h-6 text-emerald-400" />
                      Aksi Harian (Daily Tasks)
                    </h1>
                    <p className="text-white/60 text-xs sm:text-sm font-medium mt-1">
                      Pantau, selesaikan, dan edit seluruh tugas harian Anda di sini.
                    </p>
                  </div>
                </div>

                {!activeGoal ? (
                  <div className="bg-[#141415] border border-white/10 rounded-3xl p-8 text-center flex flex-col items-center justify-center max-w-lg mx-auto min-h-[220px]">
                    <Target className="w-10 h-10 text-emerald-400 mb-3" />
                    <h3 className="font-serif font-bold text-white text-lg">Butuh Goal Aktif</h3>
                    <p className="text-white/60 text-xs mt-1 mb-5 leading-relaxed">
                      Definisikan Main Goal utama Anda terlebih dahulu sebelum mengelola daftar daftar tugas harian.
                    </p>
                    <button
                      id="btn-redirect-to-goals-daily"
                      onClick={() => setActivePage('goals')}
                      className="px-4 py-2 bg-white hover:bg-white/90 text-black font-semibold text-xs rounded-xl transition cursor-pointer"
                    >
                      Buat Goal Sekarang
                    </button>
                  </div>
                ) : (
                  <WeeklyCalendar
                    tasks={tasks}
                    checkpoints={checkpoints}
                    currentWeekStartDate={currentWeekStartDate}
                    onWeekChange={setCurrentWeekStartDate}
                    onToggleTask={handleToggleTask}
                    onEditTask={handleTriggerEditTask}
                    onDeleteTask={handleDeleteTask}
                    onAddTask={handleTriggerAddTask}
                    onTriggerAi={() => setIsAiModalOpen(true)}
                    isAiGenerating={false}
                  />
                )}
              </div>
            )}

            {/* ----------------------------------------------------
                5. SETTINGS / USER DETAILS VIEW
                ---------------------------------------------------- */}
            {activePage === 'settings' && (
              <div id="settings-view" className="max-w-2xl mx-auto space-y-6">
                <div>
                  <h1 className="font-display font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
                    <Settings className="w-6 h-6 text-cyan-400" />
                    Pengaturan Akun (Settings)
                  </h1>
                  <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">
                    Kelola profil Anda, tinjau kredensial, atau lakukan pembersihan database untuk pengujian.
                  </p>
                </div>

                {/* Profile detail card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-display font-black text-2xl">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-100">{user.name}</h3>
                      <p className="text-slate-400 text-xs font-medium mt-0.5">{user.email}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-5 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500 block font-bold mb-1">USER ID</span>
                        <code className="text-slate-300 font-mono text-[10px] bg-slate-950 p-1 rounded border border-slate-850 block truncate">{user.id}</code>
                      </div>
                      <div>
                        <span className="text-slate-500 block font-bold mb-1">STATUS AKUN</span>
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold font-mono">AKTIF / PREMIUM</span>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3">
                      <button
                        id="btn-logout-settings"
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-rose-400 rounded-xl font-bold transition cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Keluar dari Akun (Logout)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <h3 className="font-display font-bold text-slate-200 text-sm">Tentang FocusFlow Planner</h3>
                  <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
                    <p>
                      FocusFlow dirancang dengan model produktivitas tiga lapis untuk menjembatani kesenjangan antara ambisi besar Anda (Goals) dan langkah aksi harian nyata (Daily Tasks).
                    </p>
                    <p>
                      Terintegrasi penuh dengan model <strong className="text-cyan-400">Google Gemini 3.5-flash</strong> untuk menyaring target mingguan menjadi rencana harian logis secara otomatis.
                    </p>
                    <p className="text-slate-500 font-medium">
                      FocusFlow Applet v1.0 • Juni 2026
                    </p>
                  </div>
                </div>

              </div>
            )}

          </motion.div>
        </AnimatePresence>
        
        {/* Humble Footer info */}
        <footer id="app-global-footer" className="text-center py-4 text-[10px] text-slate-600 border-t border-slate-900 mt-12 max-w-7xl mx-auto w-full">
          <span>FocusFlow AI Planner • Created with Google AI Studio • No unrequested credits</span>
        </footer>

      </main>

      {/* ----------------------------------------------------
          GLOBAL DIALOG MODALS
          ---------------------------------------------------- */}
      
      {/* 1. Goal Creation/Edit Modal */}
      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setGoalToEdit(null);
        }}
        onSubmit={handleGoalSubmit}
        goalToEdit={goalToEdit}
      />

      {/* 2. Checkpoint Creation/Edit Modal */}
      <CheckpointModal
        isOpen={isCheckpointModalOpen}
        onClose={() => {
          setIsCheckpointModalOpen(false);
          setCheckpointToEdit(null);
        }}
        onSubmit={handleCheckpointSubmit}
        checkpointToEdit={checkpointToEdit}
      />

      {/* 3. Daily Task Creation/Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setTaskToEdit(null);
          setTaskDefaultDate('');
        }}
        checkpoints={checkpoints}
        onSubmit={handleTaskSubmit}
        taskToEdit={taskToEdit}
        defaultDate={taskDefaultDate}
      />

      {/* 4. AI Generator Modal */}
      <AIGenerateModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        activeGoal={activeGoal}
        checkpoints={checkpoints}
        weekStartDate={currentWeekStartDate}
        onSuccess={loadAllData}
      />

    </div>
  );
}

// ----------------------------------------------------
// INTEGRATED AUTHENTICATION COMPONENT
// ----------------------------------------------------
interface AuthPageProps {
  onAuthSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
}

function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    if (!isLogin && !name.trim()) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const data = await api.login(email, password);
        onAuthSuccess(data.token, data.user);
      } else {
        const data = await api.register(name, email, password);
        onAuthSuccess(data.token, data.user);
      }
    } catch (e: any) {
      setError(e.message || 'Proses otentikasi gagal. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="auth-page-viewport" className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Visual background decorations */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/2 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#141415] border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative z-10 space-y-6"
      >
        {/* Header branding */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 rounded-2xl bg-gradient-to-r from-indigo-500 to-emerald-400 flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-black font-bold" />
          </div>
          <h1 className="font-serif font-bold text-2xl text-white tracking-tight">FocusFlow</h1>
          <p className="text-white/60 text-xs max-w-xs mx-auto">
            Bridge the Gap: Main Goal ➔ Weekly Checkpoint ➔ Daily Task
          </p>
        </div>

        {/* Tab Selector */}
        <div className="bg-white/2 p-1 rounded-xl flex border border-white/10">
          <button
            id="tab-select-login"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              isLogin ? 'bg-[#141415] text-emerald-400 shadow-sm border border-white/5' : 'text-white/40 hover:text-white'
            }`}
          >
            Masuk (Login)
          </button>
          <button
            id="tab-select-register"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              !isLogin ? 'bg-[#141415] text-emerald-400 shadow-sm border border-white/5' : 'text-white/40 hover:text-white'
            }`}
          >
            Daftar (Register)
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div id="auth-error-banner" className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-3 text-rose-400 text-xs flex gap-2 items-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label htmlFor="auth-name-input" className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                Nama Lengkap
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3.5 text-white/30">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  id="auth-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none transition"
                  placeholder="Contoh: Raka Aditya"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="auth-email-input" className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
              Alamat Email
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-white/30">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="auth-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none transition"
                placeholder="email@domain.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="auth-password-input" className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
              Kata Sandi (Password)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3.5 text-white/30">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-3 text-white text-sm outline-none transition"
                placeholder="******"
                required
              />
            </div>
          </div>

          <button
            id="btn-auth-submit"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-white hover:bg-white/90 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer mt-6"
          >
            {isLogin ? 'Masuk Sekarang' : 'Daftar Akun Baru'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Guest Onboarding Tip */}
        <div className="bg-white/2 p-3.5 border border-white/5 rounded-2xl text-[11px] text-white/40 text-center leading-relaxed">
          <span><strong>Tips:</strong> Anda bisa mendaftarkan email apa saja (misal: <code>test@gmail.com</code>) secara lokal untuk mencoba aplikasi secara private.</span>
        </div>
      </motion.div>
    </div>
  );
}
