/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Loader2, Save, X, AlertCircle, Edit3, Clock, Flame, Calendar, RefreshCcw } from 'lucide-react';
import { MainGoal, WeeklyCheckpoint, TaskPriority } from '../types';
import { api } from '../api';

interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeGoal: MainGoal | null;
  checkpoints: WeeklyCheckpoint[];
  weekStartDate: Date; // Monday date
  onSuccess: () => void;
}

interface TempTask {
  checkpointId?: string;
  day: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate: string;
}

const LOADING_STEPS = [
  'Menganalisis Main Goal Anda...',
  'Menghubungkan target Weekly Checkpoint...',
  'Merancang rencana harian Senin-Jumat yang realistis...',
  'Menghitung estimasi waktu pengerjaan optimal...',
  'Menyusun prioritas harian untuk hasil maksimal...',
];

export default function AIGenerateModal({
  isOpen,
  onClose,
  activeGoal,
  checkpoints,
  weekStartDate,
  onSuccess,
}: AIGenerateModalProps) {
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>('');
  const [step, setStep] = useState<'SELECT_CHECKPOINT' | 'GENERATING' | 'PREVIEW' | 'ERROR'>('SELECT_CHECKPOINT');
  const [loadingStepText, setLoadingStepText] = useState(LOADING_STEPS[0]);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedTasks, setGeneratedTasks] = useState<TempTask[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Set default selected checkpoint
  useEffect(() => {
    if (isOpen && checkpoints.length > 0) {
      // Find one matching current weekStartDate if possible
      const mondayStr = weekStartDate.toISOString().split('T')[0];
      const matchingCp = checkpoints.find(cp => cp.weekStartDate.split('T')[0] === mondayStr);
      if (matchingCp) {
        setSelectedCheckpointId(matchingCp.id);
      } else {
        setSelectedCheckpointId(checkpoints[0].id);
      }
      setStep('SELECT_CHECKPOINT');
      setGeneratedTasks([]);
      setErrorMessage('');
    }
  }, [isOpen, checkpoints, weekStartDate]);

  // Rotate loading text step indicators
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'GENERATING') {
      let currentIdx = 0;
      interval = setInterval(() => {
        currentIdx = (currentIdx + 1) % LOADING_STEPS.length;
        setLoadingStepText(LOADING_STEPS[currentIdx]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [step]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!activeGoal) return;
    const cp = checkpoints.find(c => c.id === selectedCheckpointId);
    if (!cp) {
      setErrorMessage('Pilih Weekly Checkpoint terlebih dahulu.');
      setStep('ERROR');
      return;
    }

    setStep('GENERATING');
    setErrorMessage('');

    try {
      const response = await api.generateAiTasks({
        goalTitle: activeGoal.title,
        goalDescription: activeGoal.description,
        checkpointTitle: cp.title,
        checkpointDescription: cp.targetDescription,
        weekStartDate: weekStartDate.toISOString().split('T')[0],
        checkpointId: cp.id,
      });

      setGeneratedTasks(response.tasks);
      setStep('PREVIEW');
    } catch (e: any) {
      setErrorMessage(e.message || 'Gagal menghasilkan tugas dari Gemini AI. Silakan coba lagi.');
      setStep('ERROR');
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await api.bulkCreateTasks(generatedTasks);
      onSuccess();
      onClose();
    } catch (e: any) {
      alert(`Gagal menyimpan: ${e.message || 'Error occurred'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (index: number, field: keyof TempTask, value: any) => {
    const updated = [...generatedTasks];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setGeneratedTasks(updated);
  };

  return (
    <div id="ai-generate-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-cyan-500/5"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-100">FocusFlow AI Planner</h3>
              <p className="text-[11px] text-slate-500 font-medium">Buat rencana harian Senin-Jumat otomatis</p>
            </div>
          </div>
          <button
            id="btn-close-ai-modal"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* 1. SELECT WEEKLY CHECKPOINT */}
            {step === 'SELECT_CHECKPOINT' && (
              <motion.div
                id="step-select-checkpoint"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/5 flex items-center justify-center text-cyan-400 shrink-0 border border-cyan-500/10">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-200 text-sm">Bagaimana ini bekerja?</h4>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      AI akan menyatukan <strong className="text-cyan-400">Main Goal aktif</strong> Anda dan <strong className="text-cyan-400">Weekly Checkpoint</strong> terpilih untuk merumuskan 5 tugas harian mandiri dari Senin s/d Jumat secara logis dan runtut.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="checkpoint-select-dropdown" className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Pilih Weekly Checkpoint untuk Acuan
                  </label>
                  {checkpoints.length === 0 ? (
                    <div id="no-checkpoints-alert" className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 flex gap-3 text-amber-400 text-xs">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <div>
                        <strong className="font-bold">Belum Ada Checkpoint Terdaftar!</strong>
                        <p className="mt-1 text-slate-400 leading-relaxed">
                          Anda harus membuat Weekly Checkpoint di tab Weekly Plan terlebih dahulu agar AI memiliki bahan target mingguan yang bisa dipecah.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <select
                      id="checkpoint-select-dropdown"
                      value={selectedCheckpointId}
                      onChange={(e) => setSelectedCheckpointId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition focus:ring-1 focus:ring-cyan-500"
                    >
                      {checkpoints.map(cp => (
                        <option key={cp.id} value={cp.id}>
                          Minggu ke-{cp.weekNumber}: {cp.title} ({cp.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
                  <button
                    id="btn-cancel-select"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    id="btn-trigger-ai-run"
                    onClick={handleGenerate}
                    disabled={checkpoints.length === 0}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/10 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    Mulai AI Generate
                  </button>
                </div>
              </motion.div>
            )}

            {/* 2. GENERATING STATE */}
            {step === 'GENERATING' && (
              <motion.div
                id="step-generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="relative">
                  {/* Glowing aura */}
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
                  <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 relative">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-display font-bold text-lg text-slate-100">Sedang Merancang Rencana Anda</h4>
                  <p className="text-cyan-400 text-xs font-mono font-medium animate-pulse">
                    {loadingStepText}
                  </p>
                </div>
                
                <p className="text-slate-500 text-[11px] max-w-xs leading-relaxed">
                  Mohon tunggu beberapa detik. FocusFlow AI sedang memproses pemecahan tugas via Google Gemini API...
                </p>
              </motion.div>
            )}

            {/* 3. TASK PREVIEW & EDIT PRE-SAVE */}
            {step === 'PREVIEW' && (
              <motion.div
                id="step-preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-cyan-500/15 border border-cyan-500/25 rounded-2xl p-4 flex gap-3 text-cyan-400 text-xs">
                  <Sparkles className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Berhasil Di-Generate!</strong>
                    <p className="mt-0.5 text-slate-300 leading-relaxed">
                      Gemini AI telah merumuskan 5 daily task (Senin-Jumat). Silakan tinjau dan edit judul atau deskripsi sebelum menyimpannya ke database.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {generatedTasks.map((task, idx) => (
                    <div
                      id={`preview-task-form-card-${idx}`}
                      key={idx}
                      className="border border-slate-800 bg-slate-950/30 hover:border-slate-750 rounded-2xl p-4 space-y-3 transition duration-150"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-850">
                        <div className="flex items-center gap-2">
                          <span className="bg-cyan-500/15 text-cyan-400 font-bold px-2.5 py-1 rounded-lg text-xs font-mono">
                            {task.day}
                          </span>
                          <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Priority Selector */}
                          <div className="flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-slate-500" />
                            <select
                              id={`select-priority-${idx}`}
                              value={task.priority}
                              onChange={(e) => handleFieldChange(idx, 'priority', e.target.value)}
                              className="bg-slate-900 text-slate-300 border border-slate-800 rounded px-2 py-0.5 text-[11px] outline-none"
                            >
                              <option value="HIGH">HIGH</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="LOW">LOW</option>
                            </select>
                          </div>

                          {/* Est Minutes Selector */}
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <input
                              id={`input-minutes-${idx}`}
                              type="number"
                              value={task.estimatedMinutes}
                              onChange={(e) => handleFieldChange(idx, 'estimatedMinutes', Number(e.target.value))}
                              className="bg-slate-900 text-slate-300 border border-slate-800 rounded px-1.5 py-0.5 text-[11px] w-14 outline-none font-mono"
                              min="5"
                              max="480"
                            />
                            <span className="text-[10px] text-slate-500 font-mono">menit</span>
                          </div>
                        </div>
                      </div>

                      {/* Title & Description editing */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1">
                          <label htmlFor={`input-title-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Judul Task</label>
                          <input
                            id={`input-title-${idx}`}
                            type="text"
                            value={task.title}
                            onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-2 text-slate-200 text-xs outline-none transition"
                            placeholder="Judul task..."
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label htmlFor={`input-desc-${idx}`} className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Aksi & Deskripsi Tugas</label>
                          <textarea
                            id={`input-desc-${idx}`}
                            value={task.description}
                            onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-850 hover:border-slate-800 focus:border-cyan-500/50 rounded-xl px-3 py-1.5 text-slate-200 text-xs outline-none resize-none h-16 transition"
                            placeholder="Detail tindakan nyata yang dilakukan..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-850">
                  <button
                    id="btn-regenerate"
                    onClick={handleGenerate}
                    className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Regenerate AI
                  </button>
                  <div className="flex gap-2">
                    <button
                      id="btn-cancel-save"
                      onClick={() => setStep('SELECT_CHECKPOINT')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition"
                    >
                      Kembali
                    </button>
                    <button
                      id="btn-save-bulk-tasks"
                      onClick={handleSaveAll}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/10 disabled:opacity-50 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Simpan Rencana Harian
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. ERROR STATE */}
            {step === 'ERROR' && (
              <motion.div
                id="step-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <AlertCircle className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-sm">
                  <h4 className="font-display font-bold text-lg text-slate-200">Gagal Generate Task</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {errorMessage}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    id="btn-error-close"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Tutup
                  </button>
                  <button
                    id="btn-error-retry"
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    Coba Lagi
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
