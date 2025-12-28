"use client";

import { ArrowUpCircle } from "lucide-react";
import { useState } from "react";

interface SurfaceButtonProps {
  onSurface: () => void;
  disabled?: boolean;
}

export function SurfaceButton({ onSurface, disabled }: SurfaceButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onSurface}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex items-center gap-2 p-2 rounded-full transition-all duration-300 hover:bg-cyan-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Surface (Logout)"
    >
      <ArrowUpCircle
        size={24}
        className={`transition-all duration-300 ${
          isHovered ? "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "text-slate-500"
        }`}
      />
      <span
        className={`font-mono text-sm tracking-widest transition-all duration-500 overflow-hidden whitespace-nowrap ${
          isHovered ? "max-w-[100px] opacity-100 text-cyan-400" : "max-w-0 opacity-0 text-slate-500"
        }`}
      >
        SURFACE
      </span>
    </button>
  );
}



