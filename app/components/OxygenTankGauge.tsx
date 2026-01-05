"use client";

import { useOxygenTank, TankStatus } from "@/app/lib/hooks/useOxygenTank";
import { Play, Pause, RotateCcw, Wind, Pin, PinOff } from "lucide-react";
import { useState, useEffect } from "react";

interface OxygenTankGaugeProps {
  onComplete?: () => void;
}

export function OxygenTankGauge({ onComplete }: OxygenTankGaugeProps) {
  const {
    status,
    timeLeft,
    progress,
    startDive,
    pauseDive,
    resumeDive,
    resetDive,
    togglePin,
    isPinned,
  } = useOxygenTank();

  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (status === "completed") {
      if (onComplete) onComplete();

      // Audio cue
      const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
      audio.volume = 0.5;
      audio.play().catch((e) => console.warn("Audio play failed", e));

      // Browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Oxygen Tank Empty", {
          body: "Time to surface for air!",
          icon: "/favicon.ico",
        });
      } else if ("Notification" in window && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }, [status, onComplete]);

  const getStatusColor = () => {
    if (progress > 60) return "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]";
    if (progress > 20) return "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]";
    return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-cyan-300/10 bg-slate-950/40 p-2 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.1)]">
      <div className="flex items-center gap-2 w-full">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/50">
          <div
            className={`h-full transition-all duration-1000 ease-linear ${getStatusColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] font-mono tabular-nums text-cyan-100/70 w-8 text-right">
          {formatTime(timeLeft)}
        </span>
      </div>

      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5">
          {status === "idle" || status === "completed" ? (
            <div className="flex items-center gap-1">
              {[25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => startDive(mins)}
                  className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-medium text-cyan-300 hover:bg-cyan-500/20"
                >
                  {mins}m
                </button>
              ))}
            </div>
          ) : (
            <>
              {status === "active" ? (
                <button
                  onClick={pauseDive}
                  className="rounded-full bg-amber-500/10 p-1 text-amber-400 hover:bg-amber-500/20"
                  title="Pause Dive"
                >
                  <Pause size={12} />
                </button>
              ) : (
                <button
                  onClick={resumeDive}
                  className="rounded-full bg-emerald-500/10 p-1 text-emerald-400 hover:bg-emerald-500/20"
                  title="Resume Dive"
                >
                  <Play size={12} />
                </button>
              )}
              <button
                onClick={resetDive}
                className="rounded-full bg-rose-500/10 p-1 text-rose-400 hover:bg-rose-500/20"
                title="Reset Tank"
              >
                <RotateCcw size={12} />
              </button>
            </>
          )}
        </div>

        <button
          onClick={togglePin}
          className={`rounded-full p-1 transition-colors ${
            isPinned
              ? "bg-cyan-500/20 text-cyan-300"
              : "text-cyan-100/30 hover:bg-cyan-500/10 hover:text-cyan-100/60"
          }`}
          title={isPinned ? "Unpin Tank" : "Pin Tank (Keep Visible)"}
        >
          {isPinned ? <Pin size={11} /> : <PinOff size={11} />}
        </button>
      </div>

      {status === "completed" && (
        <div className="text-[9px] font-medium text-rose-400 animate-bounce mt-1">
          Surface for air!
        </div>
      )}
    </div>
  );
}

