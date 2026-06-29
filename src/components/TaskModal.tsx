/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Clock, Flame, AlertCircle } from 'lucide-react';
import { DailyTask, TaskPriority, WeeklyCheckpoint } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpoints: WeeklyCheckpoint[];
  onSubmit: (task: {
    title: string;
    description?: string;
    priority: TaskPriority;
    dueDate: string;
    estimatedMinutes?: number;
    checkpointId?: string;
  }) => Promise<void>;
  taskToEdit?: DailyTask | null;
  defaultDate?: string; // pre-populated when adding for a specific calendar day
}

export default function TaskModal({
  isOpen,
  onClose,
  checkpoints,
  onSubmit,
  taskToEdit,
  defaultDate,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>('');
  const [checkpointId, setCheckpointId] = useState<string>('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || '');
        setPriority(taskToEdit.priority);
        setDueDate(taskToEdit.dueDate);
        setEstimatedMinutes(taskToEdit.estimatedMinutes ? String(taskToEdit.estimatedMinutes) : '');
        setCheckpointId(taskToEdit.checkpointId || '');
      } else {
        setTitle('');
        setDescription('');
        setPriority('MEDIUM');
        setDueDate(defaultDate || new Date().toISOString().split('T')[0]);
        setEstimatedMinutes('60');
        setCheckpointId(checkpoints.length > 0 ? checkpoints[0].id : '');
      }
      setError('');
    }
  }, [isOpen, taskToEdit, defaultDate, checkpoints]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Judul task harian wajib diisi.');
      return;
    }
    if (!dueDate) {
      setError('Tanggal pengerjaan wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({
        title,
        description: description || undefined,
        priority,
        dueDate,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        checkpointId: checkpointId || undefined,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan task.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="task-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-bold text-slate-100">
              {taskToEdit ? 'Edit Daily Task' : 'Buat Daily Task Baru'}
            </h3>
          </div>
          <button
            id="btn-close-task-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div id="task-form-error" className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-xs flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="task-title-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Judul Tugas (Daily Task) *
            </label>
            <input
              id="task-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500"
              placeholder="Contoh: Tulis rancangan database skema"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="task-desc-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Langkah Penyelesaian / Deskripsi (Opsional)
            </label>
            <textarea
              id="task-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500 h-20 resize-none"
              placeholder="Tambahkan aksi spesifik..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="task-due-date-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Tanggal Tugas *
              </label>
              <input
                id="task-due-date-input"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="task-est-min-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Estimasi Durasi (Menit)
              </label>
              <input
                id="task-est-min-input"
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500 font-mono"
                placeholder="60"
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="task-priority-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Tingkat Prioritas
              </label>
              <select
                id="task-priority-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500"
              >
                <option value="HIGH">HIGH (Tinggi)</option>
                <option value="MEDIUM">MEDIUM (Sedang)</option>
                <option value="LOW">LOW (Rendah)</option>
              </select>
            </div>

            {checkpoints.length > 0 && (
              <div className="space-y-1">
                <label htmlFor="task-checkpoint-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Link ke Checkpoint (Opsional)
                </label>
                <select
                  id="task-checkpoint-select"
                  value={checkpointId}
                  onChange={(e) => setCheckpointId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="">-- Tanpa Hubungan --</option>
                  {checkpoints.map(cp => (
                    <option key={cp.id} value={cp.id}>
                      W{cp.weekNumber}: {cp.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
            <button
              id="btn-cancel-task-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              id="btn-submit-task-form"
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isLoading ? 'Menyimpan...' : 'Simpan Task'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
