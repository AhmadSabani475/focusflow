/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WeeklyCheckpoint, CheckpointStatus } from '../types';
import { CheckCircle2, Circle, PlayCircle, Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface CheckpointTimelineProps {
  checkpoints: WeeklyCheckpoint[];
  onUpdateStatus: (id: string, currentStatus: CheckpointStatus) => void;
  onEdit: (checkpoint: WeeklyCheckpoint) => void;
  onDelete: (id: string) => void;
  onAddClick: () => void;
}

const STATUS_CONFIG = {
  NOT_STARTED: {
    label: 'Not Started',
    colorClass: 'text-white/40 bg-white/5 border-white/10 hover:bg-white/10',
    icon: Circle,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    colorClass: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30 hover:bg-indigo-950/60 shadow-md shadow-indigo-500/5',
    icon: PlayCircle,
  },
  DONE: {
    label: 'Done',
    colorClass: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30 hover:bg-emerald-950/60',
    icon: CheckCircle2,
  },
};

export default function CheckpointTimeline({
  checkpoints,
  onUpdateStatus,
  onEdit,
  onDelete,
  onAddClick,
}: CheckpointTimelineProps) {
  // Sort checkpoints by week number
  const sortedCheckpoints = [...checkpoints].sort((a, b) => a.weekNumber - b.weekNumber);

  return (
    <div id="checkpoint-timeline-container" className="bg-[#141415] border border-white/10 rounded-2xl p-6 h-full flex flex-col justify-between shadow-xl">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <h3 className="font-sans font-bold text-base text-white">Weekly Checkpoints</h3>
          </div>
          <button
            id="btn-add-checkpoint"
            onClick={onAddClick}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah
          </button>
        </div>

        {sortedCheckpoints.length === 0 ? (
          <div id="checkpoints-empty-state" className="text-center py-8 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl">
            <Calendar className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-white/60 text-sm font-medium">Belum ada checkpoint mingguan</p>
            <p className="text-white/40 text-xs mt-1 max-w-[200px]">Buat checkpoint untuk memecah goal menjadi target mingguan.</p>
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-white/5 space-y-6">
            {sortedCheckpoints.map((cp, idx) => {
              const config = STATUS_CONFIG[cp.status] || STATUS_CONFIG.NOT_STARTED;
              const StatusIcon = config.icon;

              return (
                <motion.div
                  id={`checkpoint-item-${cp.id}`}
                  key={cp.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative group"
                >
                  {/* Status Node Dot on Timeline Line */}
                  <span className="absolute -left-[33px] top-1.5 bg-[#0A0A0A] p-0.5 rounded-full z-10">
                    <span 
                      onClick={() => onUpdateStatus(cp.id, cp.status)}
                      className={`w-4.5 h-4.5 rounded-full flex items-center justify-center cursor-pointer border transition-all duration-200 ${
                        cp.status === 'DONE' 
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
                          : cp.status === 'IN_PROGRESS'
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30'
                          : 'border-white/20 bg-[#141415] text-white/40 hover:border-white/40'
                      }`}
                    >
                      {cp.status === 'DONE' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : cp.status === 'IN_PROGRESS' ? (
                        <PlayCircle className="w-3 h-3" />
                      ) : (
                        <Circle className="w-3 h-3" />
                      )}
                    </span>
                  </span>

                  {/* Checkpoint Item Body */}
                  <div className="bg-white/2 group-hover:bg-white/5 border border-white/5 group-hover:border-white/10 rounded-xl p-4 transition duration-150">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-bold text-indigo-400 mb-0.5 tracking-wide">WEEK {cp.weekNumber}</span>
                        <h4 className="font-semibold text-sm text-white transition">
                          {cp.title}
                        </h4>
                      </div>

                      {/* Controls */}
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition">
                        <button
                          id={`btn-edit-checkpoint-${cp.id}`}
                          onClick={() => onEdit(cp)}
                          className="p-1 hover:bg-white/5 text-white/50 hover:text-indigo-400 rounded transition cursor-pointer"
                          title="Edit Checkpoint"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-checkpoint-${cp.id}`}
                          onClick={() => onDelete(cp.id)}
                          className="p-1 hover:bg-white/5 text-white/50 hover:text-rose-400 rounded transition cursor-pointer"
                          title="Hapus Checkpoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {cp.targetDescription && (
                      <p className="text-white/60 text-xs mb-3 leading-relaxed">
                        {cp.targetDescription}
                      </p>
                    )}

                    {/* Status Pill Badge (Clickable to switch status) */}
                    <div className="flex items-center justify-between text-[11px] border-t border-white/5 pt-2.5 mt-2">
                      <span className="text-white/40 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-white/20" />
                        Mulai: {new Date(cp.weekStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>

                      <button
                        id={`btn-status-toggle-${cp.id}`}
                        onClick={() => onUpdateStatus(cp.id, cp.status)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-semibold transition duration-150 cursor-pointer ${config.colorClass}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
