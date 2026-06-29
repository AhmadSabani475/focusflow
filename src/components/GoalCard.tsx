/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Target, Calendar, ArrowRight, Edit, AlertCircle } from 'lucide-react';
import { MainGoal } from '../types';

interface GoalCardProps {
  goal: MainGoal | null;
  onEdit: () => void;
  onNavigateToGoals: () => void;
}

export default function GoalCard({ goal, onEdit, onNavigateToGoals }: GoalCardProps) {
  if (!goal) {
    return (
      <div 
        id="goal-card-empty" 
        className="bg-[#141415] border border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center text-center justify-center h-full min-h-[220px]"
      >
        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/50 mb-4 border border-white/10">
          <Target className="w-6 h-6 text-emerald-400" />
        </div>
        <h3 className="font-sans font-semibold text-lg text-white mb-1">Belum Ada Goal Aktif</h3>
        <p className="text-white/60 text-sm max-w-md mb-5">
          Tentukan tujuan utama Anda terlebih dahulu sebelum memecahnya menjadi rencana mingguan dan aksi harian.
        </p>
        <button
          id="btn-create-first-goal"
          onClick={onNavigateToGoals}
          className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-white/90 active:scale-95 text-black font-semibold text-sm rounded-xl transition duration-200 shadow-md shadow-white/5 cursor-pointer"
        >
          Buat Main Goal Sekarang
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Calculate days remaining
  const deadlineDate = new Date(goal.deadline);
  const today = new Date();
  const timeDiff = deadlineDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  const isOverdue = daysDiff < 0;

  return (
    <motion.div
      id={`goal-card-${goal.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#141415] border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-full shadow-xl"
    >
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div>
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20 text-xs font-mono font-semibold">
            <Target className="w-3.5 h-3.5" />
            GOAL AKTIF
          </div>
          <button
            id={`btn-edit-goal-${goal.id}`}
            onClick={onEdit}
            className="p-1.5 hover:bg-white/5 text-white/50 hover:text-emerald-400 rounded-lg transition duration-150 cursor-pointer"
            title="Edit Goal"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-serif font-bold text-xl md:text-2xl text-white mb-2 leading-snug">
          {goal.title}
        </h3>
        
        {goal.description && (
          <p className="text-white/70 text-sm mb-4 leading-relaxed line-clamp-3">
            {goal.description}
          </p>
        )}
      </div>

      <div className="mt-4">
        {/* Progress Bar Header */}
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-white/40 font-medium tracking-wide">TOTAL PROGRESS</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">{goal.progress}%</span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 mb-4">
          <motion.div
            id={`goal-progress-bar-${goal.id}`}
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${goal.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs text-white/50">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-white/30" />
            <span>Deadline: <strong className="text-white/70 font-mono">{new Date(goal.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
          </div>

          <div className={`flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-400' : 'text-emerald-400'}`}>
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>
              {isOverdue 
                ? 'Lewat deadline!' 
                : `${daysDiff} hari tersisa`}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
