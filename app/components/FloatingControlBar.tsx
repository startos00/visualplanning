"use client";

import { Columns } from "lucide-react";

type FloatingControlBarProps = {
  selectedCount: number;
  onCompare: () => void;
};

export function FloatingControlBar({ selectedCount, onCompare }: FloatingControlBarProps) {
  if (selectedCount < 2) return null;

  return (
    <div className="fixed bottom-8 left-1/2 z-[60] -translate-x-1/2">
      <button
        onClick={onCompare}
        className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-950/90 px-6 py-3 text-sm font-semibold text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.3)] backdrop-blur-md transition-all hover:bg-slate-900/90 hover:shadow-[0_0_32px_rgba(34,211,238,0.4)]"
      >
        <Columns className="h-5 w-5" />
        Compare Documents ({selectedCount})
      </button>
    </div>
  );
}

