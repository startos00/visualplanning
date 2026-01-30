"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Target,
  Clock,
  ExternalLink,
} from "lucide-react";
import type { Node } from "reactflow";
import type { GrimpoNodeData } from "@/app/lib/graph";

type FocusViewProps = {
  task: Node<GrimpoNodeData> | undefined;
  strategy: Node<GrimpoNodeData> | null;
  currentIndex: number;
  totalPending: number;
  onComplete: () => void;
  onSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
  onFocusOnCanvas?: () => void;
  theme?: "abyss" | "surface";
};

const TIMER_PRESETS = [
  { label: "25m", seconds: 25 * 60 },
  { label: "45m", seconds: 45 * 60 },
  { label: "60m", seconds: 60 * 60 },
];

export function FocusView({
  task,
  strategy,
  currentIndex,
  totalPending,
  onComplete,
  onSkip,
  onPrev,
  onNext,
  onFocusOnCanvas,
  theme = "abyss",
}: FocusViewProps) {
  const isSurface = theme === "surface";
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerTotal, setTimerTotal] = useState(25 * 60);

  // Timer logic
  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          // Could add audio notification here
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const timerPercent = timerTotal > 0 ? (timerSeconds / timerTotal) * 100 : 0;

  const resetTimer = useCallback((seconds: number) => {
    setTimerSeconds(seconds);
    setTimerTotal(seconds);
    setTimerRunning(false);
  }, []);

  // Get timer color based on remaining time
  const getTimerColor = () => {
    const percent = timerPercent;
    if (percent > 60) return isSurface ? "bg-emerald-500" : "bg-emerald-400";
    if (percent > 20) return isSurface ? "bg-amber-500" : "bg-amber-400";
    return isSurface ? "bg-red-500" : "bg-red-400";
  };

  if (!task) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 flex flex-col items-center justify-center p-8"
      >
        <div
          className={`text-center ${
            isSurface ? "text-slate-400" : "text-cyan-300/40"
          }`}
        >
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">All tasks complete!</p>
          <p className="text-sm mt-2 opacity-70">
            Great work. Time to surface for air.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto"
    >
      {/* Navigation */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onPrev}
          disabled={totalPending <= 1}
          className={`p-2 rounded-full transition-colors ${
            totalPending <= 1
              ? "opacity-30 cursor-not-allowed"
              : isSurface
                ? "hover:bg-slate-100 text-slate-500"
                : "hover:bg-cyan-500/20 text-cyan-300/50"
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span
          className={`text-xs font-medium ${
            isSurface ? "text-slate-400" : "text-cyan-300/50"
          }`}
        >
          {currentIndex + 1} of {totalPending} pending
        </span>
        <button
          onClick={onNext}
          disabled={totalPending <= 1}
          className={`p-2 rounded-full transition-colors ${
            totalPending <= 1
              ? "opacity-30 cursor-not-allowed"
              : isSurface
                ? "hover:bg-slate-100 text-slate-500"
                : "hover:bg-cyan-500/20 text-cyan-300/50"
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Task title */}
      <h1
        className={`text-2xl font-bold text-center mb-2 ${
          isSurface ? "text-slate-800" : "text-cyan-50"
        }`}
      >
        {task.data.title || "Untitled Task"}
      </h1>

      {/* Metadata */}
      <div className="flex items-center gap-3 mb-6">
        {task.data.planDeadline && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              isSurface
                ? "bg-amber-100 text-amber-700"
                : "bg-amber-500/20 text-amber-300"
            }`}
          >
            {task.data.planDeadline}
          </span>
        )}
        {strategy && (
          <span
            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
              isSurface
                ? "bg-rose-100 text-rose-700"
                : "bg-rose-500/20 text-rose-300"
            }`}
          >
            <Target className="h-3 w-3" />
            {strategy.data.title}
          </span>
        )}
        {onFocusOnCanvas && (
          <button
            onClick={onFocusOnCanvas}
            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 transition-colors ${
              isSurface
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                : "bg-cyan-500/10 text-cyan-300/70 hover:bg-cyan-500/20"
            }`}
          >
            <ExternalLink className="h-3 w-3" />
            View on canvas
          </button>
        )}
      </div>

      {/* Timer */}
      <div className="w-full max-w-md mb-8">
        {/* Timer display */}
        <div
          className={`relative h-3 rounded-full overflow-hidden mb-3 ${
            isSurface ? "bg-slate-200" : "bg-slate-800"
          }`}
        >
          <motion.div
            className={`absolute inset-y-0 left-0 rounded-full transition-colors ${getTimerColor()}`}
            initial={{ width: "100%" }}
            animate={{ width: `${timerPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <span
            className={`text-4xl font-mono font-bold ${
              isSurface ? "text-slate-700" : "text-cyan-100"
            }`}
          >
            {formatTime(timerSeconds)}
          </span>
        </div>

        {/* Timer controls */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => setTimerRunning(!timerRunning)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
              timerRunning
                ? isSurface
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                : isSurface
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
            }`}
          >
            {timerRunning ? (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Dive
              </>
            )}
          </button>
          <button
            onClick={() => resetTimer(timerTotal)}
            className={`p-2 rounded-xl transition-colors ${
              isSurface
                ? "text-slate-500 hover:bg-slate-100"
                : "text-cyan-300/50 hover:bg-cyan-500/10"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        {/* Timer presets */}
        <div className="flex items-center justify-center gap-2">
          {TIMER_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => resetTimer(preset.seconds)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                timerTotal === preset.seconds
                  ? isSurface
                    ? "bg-slate-200 text-slate-700"
                    : "bg-cyan-500/20 text-cyan-200"
                  : isSurface
                    ? "text-slate-400 hover:bg-slate-100"
                    : "text-cyan-300/40 hover:bg-cyan-500/10"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      {task.data.notes && (
        <div
          className={`w-full max-w-md mb-8 p-4 rounded-xl ${
            isSurface ? "bg-slate-50 border border-slate-200" : "bg-slate-900/50 border border-cyan-500/10"
          }`}
        >
          <p
            className={`text-sm whitespace-pre-wrap ${
              isSurface ? "text-slate-600" : "text-cyan-200/70"
            }`}
          >
            {task.data.notes}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={onComplete}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
            isSurface
              ? "bg-emerald-500 text-white hover:bg-emerald-600"
              : "bg-emerald-500/80 text-white hover:bg-emerald-500"
          }`}
        >
          <CheckCircle2 className="h-5 w-5" />
          Complete
        </button>
        <button
          onClick={onSkip}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-colors ${
            isSurface
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
              : "bg-slate-800 text-cyan-200/70 hover:bg-slate-700"
          }`}
        >
          <SkipForward className="h-5 w-5" />
          Skip
        </button>
      </div>
    </motion.div>
  );
}
