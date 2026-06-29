/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DailyTask, TaskPriority, TaskStatus, WeeklyCheckpoint } from '../types';
import { ChevronLeft, ChevronRight, Plus, Sparkles, CheckSquare, Square, Trash2, Edit2, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WeeklyCalendarProps {
  tasks: DailyTask[];
  checkpoints: WeeklyCheckpoint[];
  currentWeekStartDate: Date; // Monday
  onWeekChange: (newDate: Date) => void;
  onToggleTask: (id: string) => void;
  onEditTask: (task: DailyTask) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (dueDate: string) => void;
  onTriggerAi: () => void;
  isAiGenerating: boolean;
}

const DAYS_NAME = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];
const DAYS_ENG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const PRIORITY_BADGES = {
  HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export default function WeeklyCalendar({
  tasks,
  checkpoints,
  currentWeekStartDate,
  onWeekChange,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddTask,
  onTriggerAi,
  isAiGenerating,
}: WeeklyCalendarProps) {
  const [activeMobileDay, setActiveMobileDay] = useState<number>(0); // 0 = Monday (Senin)

  // Generate date strings for Mon-Fri of the selected week
  const weekDates: string[] = [];
  const weekDateObjects: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(currentWeekStartDate);
    d.setDate(currentWeekStartDate.getDate() + i);
    weekDateObjects.push(d);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  // Check if today is in this week and highlight it
  const todayStr = new Date().toISOString().split('T')[0];

  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStartDate);
    prev.setDate(currentWeekStartDate.getDate() - 7);
    onWeekChange(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekStartDate);
    next.setDate(currentWeekStartDate.getDate() + 7);
    onWeekChange(next);
  };

  const handleCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0,0,0,0);
    onWeekChange(monday);
  };

  // Format week range title, e.g., "29 Juni - 03 Juli 2026"
  const formatDateRange = () => {
    const start = weekDateObjects[0];
    const end = weekDateObjects[4];
    const monthOptions: Intl.DateTimeFormatOptions = { month: 'long' };
    const startDay = start.getDate();
    const startMonth = start.toLocaleDateString('id-ID', monthOptions);
    const endDay = end.getDate();
    const endMonth = end.toLocaleDateString('id-ID', monthOptions);
    const year = start.getFullYear();

    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  };

  // Find checkpoint associated with this week if any
  const currentWeekNum = Math.ceil((currentWeekStartDate.getTime() - new Date(currentWeekStartDate.getFullYear(), 0, 1).getTime()) / (24 * 3600 * 1000 * 7)) + 1;
  const activeCheckpoint = checkpoints.find(cp => {
    // Check if checkpoint starts on this Monday
    return cp.weekStartDate.split('T')[0] === weekDates[0];
  });

  return (
    <div id="weekly-calendar-card" className="bg-[#141415] border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl">
      
      {/* Calendar Header with Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-5">
        <div className="flex flex-col">
          <h2 className="font-sans font-bold text-base text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Kalender Mingguan
          </h2>
          <span className="text-white/40 text-xs font-mono font-medium mt-0.5">{formatDateRange()}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Week Nav controls */}
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5">
            <button
              id="btn-prev-week"
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-white/5 text-white/60 hover:text-white rounded-lg transition cursor-pointer"
              title="Minggu Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="btn-current-week"
              onClick={handleCurrentWeek}
              className="px-3 py-1 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              id="btn-next-week"
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-white/5 text-white/60 hover:text-white rounded-lg transition cursor-pointer"
              title="Minggu Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* ✨ AI Generator Trigger Button */}
          {activeCheckpoint ? (
            <button
              id="btn-generate-ai-tasks-top"
              onClick={onTriggerAi}
              disabled={isAiGenerating}
              className={`flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-emerald-400 hover:from-indigo-600 hover:to-emerald-500 text-black font-bold text-xs rounded-xl transition duration-200 shadow-md active:scale-95 disabled:opacity-50 cursor-pointer`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isAiGenerating ? 'Generating...' : '✨ Generate AI Tasks'}
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 text-white/30 border border-white/10 font-bold text-xs rounded-xl"
              title="Buat Weekly Checkpoint terlebih dahulu untuk generate AI tasks"
            >
              <Sparkles className="w-3.5 h-3.5 text-white/20" />
              ✨ AI Generate (Butuh Checkpoint)
            </button>
          )}
        </div>
      </div>

      {/* Week's active checkpoint notification banner */}
      {activeCheckpoint && (
        <div id={`active-checkpoint-banner-${activeCheckpoint.id}`} className="bg-white/2 border border-white/10 rounded-xl p-3.5 mb-5 flex items-start gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[10px] text-emerald-400 tracking-wider">CHECKPOINT MINGGU INI</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                activeCheckpoint.status === 'DONE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                activeCheckpoint.status === 'IN_PROGRESS' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                'bg-white/5 text-white/40 border border-white/10'
              }`}>{activeCheckpoint.status}</span>
            </div>
            <h4 className="font-semibold text-white mt-0.5">{activeCheckpoint.title}</h4>
            {activeCheckpoint.targetDescription && <p className="text-white/60 mt-1">{activeCheckpoint.targetDescription}</p>}
          </div>
        </div>
      )}

      {/* Mobile Day Selection tabs */}
      <div className="flex md:hidden bg-white/5 border border-white/10 p-1 rounded-xl mb-4">
        {DAYS_NAME.map((name, idx) => {
          const dObj = weekDateObjects[idx];
          const isToday = dObj.toISOString().split('T')[0] === todayStr;
          return (
            <button
              id={`btn-mobile-day-${idx}`}
              key={name}
              onClick={() => setActiveMobileDay(idx)}
              className={`flex-1 py-2 text-center rounded-lg transition text-xs flex flex-col items-center justify-center ${
                activeMobileDay === idx 
                  ? 'bg-white text-black font-bold' 
                  : isToday
                  ? 'text-emerald-400 font-semibold'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              <span>{name}</span>
              <span className={`text-[10px] font-mono ${activeMobileDay === idx ? 'text-black/60' : 'text-white/20'}`}>
                {dObj.getDate()}/{dObj.getMonth() + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid Columns for Desktop / Mobile conditional render */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {DAYS_NAME.map((dayName, idx) => {
          const dateStr = weekDates[idx];
          const isToday = dateStr === todayStr;
          const dateObj = weekDateObjects[idx];
          
          // Filter tasks for this day
          const dayTasks = tasks.filter(t => t.dueDate === dateStr);

          // Render only active day on mobile, and all columns on desktop
          const isMobileHidden = activeMobileDay !== idx;

          return (
            <div
              id={`calendar-column-${dayName}`}
              key={dayName}
              className={`flex flex-col bg-white/2 rounded-xl border p-3 min-h-[300px] transition-all duration-200 ${
                isToday 
                  ? 'border-emerald-500/40 bg-emerald-500/5 shadow-lg shadow-emerald-500/2' 
                  : 'border-white/5 hover:border-white/10'
              } ${isMobileHidden ? 'hidden md:flex' : 'flex'}`}
            >
              {/* Day Column Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                <div className="flex flex-col">
                  <span className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-emerald-400' : 'text-white/60'}`}>
                    {dayName} {isToday && <strong className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded ml-1 font-mono border border-emerald-500/20">TODAY</strong>}
                  </span>
                  <span className="text-[11px] text-white/40 font-mono mt-0.5">
                    {dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <button
                  id={`btn-add-task-${dayName}`}
                  onClick={() => onAddTask(dateStr)}
                  className="p-1 text-white/40 hover:text-emerald-400 hover:bg-white/5 rounded transition cursor-pointer"
                  title={`Tambah Task untuk ${dayName}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Day's tasks */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[400px]">
                {dayTasks.length === 0 ? (
                  <div className="text-center py-8 text-white/20 text-xs flex flex-col items-center justify-center h-full min-h-[120px]">
                    <Clock className="w-5 h-5 text-white/10 mb-1" />
                    <span>Kosong</span>
                  </div>
                ) : (
                  <AnimatePresence>
                    {dayTasks.map(task => (
                      <motion.div
                        id={`task-item-${task.id}`}
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`group relative border rounded-xl p-3 flex flex-col justify-between transition duration-150 ${
                          task.status === 'DONE' 
                            ? 'bg-white/1 border-white/5 opacity-50' 
                            : 'bg-white/3 hover:bg-white/5 border-white/5 hover:border-white/10 shadow-md'
                        }`}
                      >
                        {/* Task Top: Checkbox & Title */}
                        <div className="flex items-start gap-2">
                          <button
                            id={`btn-check-task-${task.id}`}
                            onClick={() => onToggleTask(task.id)}
                            className="text-white/40 hover:text-emerald-400 mt-0.5 transition cursor-pointer shrink-0"
                          >
                            {task.status === 'DONE' ? (
                              <CheckSquare className="w-4.5 h-4.5 text-emerald-400" />
                            ) : (
                              <Square className="w-4.5 h-4.5 text-white/30" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h4 className={`text-xs font-semibold break-words leading-snug ${
                              task.status === 'DONE' 
                                ? 'line-through text-white/30' 
                                : 'text-white'
                            }`}>
                              {task.title}
                            </h4>
                            
                            {task.description && (
                              <p className={`text-[10px] mt-1 break-words line-clamp-2 leading-relaxed ${
                                task.status === 'DONE' ? 'text-white/20' : 'text-white/60'
                              }`}>
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Task Bottom Details */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
                          <div className="flex flex-wrap gap-1 items-center">
                            {/* Priority */}
                            <span className={`px-1.5 py-0.5 rounded text-[9px] border font-semibold ${
                              PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.MEDIUM
                            }`}>
                              {task.priority}
                            </span>

                            {/* Estimated Minutes */}
                            {task.estimatedMinutes && (
                              <span className="text-[9px] font-mono font-medium text-white/30 flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {task.estimatedMinutes}m
                              </span>
                            )}

                            {/* AI Badge */}
                            {task.isAiGenerated && (
                              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                                AI
                              </span>
                            )}
                          </div>

                          {/* Action Hover Controls */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
                            <button
                              id={`btn-edit-task-${task.id}`}
                              onClick={() => onEditTask(task)}
                              className="p-1 hover:bg-white/5 text-white/40 hover:text-indigo-400 rounded transition cursor-pointer"
                              title="Edit Task"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              id={`btn-delete-task-${task.id}`}
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1 hover:bg-white/5 text-white/40 hover:text-rose-400 rounded transition cursor-pointer"
                              title="Hapus Task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
