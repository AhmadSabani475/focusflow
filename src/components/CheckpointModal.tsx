/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Calendar, AlertCircle } from 'lucide-react';
import { WeeklyCheckpoint, CheckpointStatus } from '../types';

interface CheckpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    weekNumber: number,
    weekStartDate: string,
    title: string,
    targetDescription?: string,
    status?: CheckpointStatus
  ) => Promise<void>;
  checkpointToEdit?: WeeklyCheckpoint | null;
}

export default function CheckpointModal({ isOpen, onClose, onSubmit, checkpointToEdit }: CheckpointModalProps) {
  const [title, setTitle] = useState('');
  const [targetDescription, setTargetDescription] = useState('');
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [weekStartDate, setWeekStartDate] = useState('');
  const [status, setStatus] = useState<CheckpointStatus>('NOT_STARTED');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (checkpointToEdit) {
        setTitle(checkpointToEdit.title);
        setTargetDescription(checkpointToEdit.targetDescription || '');
        setWeekNumber(checkpointToEdit.weekNumber);
        
        const d = new Date(checkpointToEdit.weekStartDate);
        setWeekStartDate(d.toISOString().split('T')[0]);
        setStatus(checkpointToEdit.status);
      } else {
        setTitle('');
        setTargetDescription('');
        setWeekNumber(1);
        
        // Default to current Monday
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        setWeekStartDate(monday.toISOString().split('T')[0]);
        setStatus('NOT_STARTED');
      }
      setError('');
    }
  }, [isOpen, checkpointToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Judul checkpoint mingguan wajib diisi.');
      return;
    }
    if (!weekStartDate) {
      setError('Tanggal mulai minggu wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(weekNumber, weekStartDate, title, targetDescription, status);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan checkpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="checkpoint-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-bold text-slate-100">
              {checkpointToEdit ? 'Edit Weekly Checkpoint' : 'Buat Weekly Checkpoint Baru'}
            </h3>
          </div>
          <button
            id="btn-close-checkpoint-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div id="checkpoint-form-error" className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-xs flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 space-y-1">
              <label htmlFor="checkpoint-week-num-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Minggu Ke *
              </label>
              <input
                id="checkpoint-week-num-input"
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500 font-mono"
                min="1"
                required
              />
            </div>

            <div className="col-span-2 space-y-1">
              <label htmlFor="checkpoint-week-date-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Mulai Hari Senin *
              </label>
              <input
                id="checkpoint-week-date-input"
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="checkpoint-title-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Judul Checkpoint Mingguan *
            </label>
            <input
              id="checkpoint-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500"
              placeholder="Contoh: Belajar dasar HTML, CSS, & Git"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="checkpoint-desc-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Target Detail / Kriteria Selesai (Opsional)
            </label>
            <textarea
              id="checkpoint-desc-input"
              value={targetDescription}
              onChange={(e) => setTargetDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500 h-24 resize-none"
              placeholder="Sebutkan hal konkret yang ingin dihasilkan minggu ini..."
            />
          </div>

          {checkpointToEdit && (
            <div className="space-y-1">
              <label htmlFor="checkpoint-status-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Status Checkpoint
              </label>
              <select
                id="checkpoint-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as CheckpointStatus)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500"
              >
                <option value="NOT_STARTED">Not Started (Belum Mulai)</option>
                <option value="IN_PROGRESS">In Progress (Sedang Dikerjakan)</option>
                <option value="DONE">Done (Selesai)</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
            <button
              id="btn-cancel-checkpoint-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              id="btn-submit-checkpoint-form"
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isLoading ? 'Menyimpan...' : 'Simpan Checkpoint'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
