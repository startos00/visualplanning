"use client";

import { Check } from "lucide-react";

export type AbyssalCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
};

export function AbyssalCheckbox({ checked, onChange, label, className = "" }: AbyssalCheckboxProps) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 group ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={`flex h-5 w-5 items-center justify-center rounded-lg border transition-all duration-200 ${
          checked 
            ? "border-cyan-400/50 bg-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.3)]" 
            : "border-cyan-300/20 bg-slate-950/40 group-hover:border-cyan-300/40"
        }`}>
          <Check className={`h-3.5 w-3.5 text-cyan-50 transition-all duration-200 ${
            checked ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`} />
        </div>
        {/* Glow effect when checked */}
        {checked && (
          <div className="absolute inset-0 -z-10 animate-pulse rounded-lg bg-cyan-400/20 blur-md" />
        )}
      </div>
      {label && <span className="text-sm text-cyan-100/80 group-hover:text-cyan-50 transition-colors">{label}</span>}
    </label>
  );
}

