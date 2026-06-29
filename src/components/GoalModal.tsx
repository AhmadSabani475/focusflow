/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Target, AlertCircle } from 'lucide-react';
import { MainGoal } from '../types';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string, deadline: string) => Promise<void>;
  goalToEdit?: MainGoal | null;
}

export default function GoalModal({ isOpen, onClose, onSubmit, goalToEdit }: GoalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (goalToEdit) {
        setTitle(goalToEdit.title);
        setDescription(goalToEdit.description || '');
        // format ISO string to YYYY-MM-DD
        const d = new Date(goalToEdit.deadline);
        setDeadline(d.toISOString().split('T')[0]);
      } else {
        setTitle('');
        setDescription('');
        setDeadline('');
      }
      setError('');
    }
  }, [isOpen, goalToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Judul Goal utama wajib diisi.');
      return;
    }
    if (!deadline) {
      setError('Deadline pencapaian wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(title, description, deadline);
      onClose();
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan goal.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="goal-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-bold text-slate-100">
              {goalToEdit ? 'Edit Main Goal' : 'Buat Main Goal Baru'}
            </h3>
          </div>
          <button
            id="btn-close-goal-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div id="goal-form-error" className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-xs flex gap-2 items-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!goalToEdit && (
            <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs rounded-xl p-3 leading-relaxed">
              <strong>Catatan:</strong> FocusFlow didesain agar Anda fokus penuh pada satu tujuan utama. Membuat goal baru otomatis akan mengarsip goal aktif sebelumnya.
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="goal-title-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Judul Tujuan Utama (Main Goal) *
            </label>
            <input
              id="goal-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500"
              placeholder="Contoh: Menguasai MERN Stack Fullstack Developer"
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="goal-desc-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Deskripsi / Detail Rencana (Opsional)
            </label>
            <textarea
              id="goal-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500 h-24 resize-none"
              placeholder="Sebutkan alasan atau garis besar rencana pencapaian Anda..."
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="goal-deadline-input" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Tanggal Deadline *
            </label>
            <input
              id="goal-deadline-input"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500 font-mono"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
            <button
              id="btn-cancel-goal-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              id="btn-submit-goal-form"
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/10 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isLoading ? 'Menyimpan...' : 'Simpan Goal'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
