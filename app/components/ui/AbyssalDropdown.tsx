"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export type AbyssalDropdownOption = {
  label: string;
  value: string;
};

export type AbyssalDropdownProps = {
  options: AbyssalDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  title?: string;
  theme?: "abyss" | "surface";
};

export function AbyssalDropdown({
  options,
  value,
  onChange,
  label,
  className = "",
  title,
  theme = "abyss",
}: AbyssalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure we always have a valid value
  const selectedOption = options.find((opt) => opt.value === value);
  const fallbackValue = options.length > 0 ? options[0].value : "";
  const displayValue = selectedOption ? value : fallbackValue;
  const displayOption = options.find((opt) => opt.value === displayValue) || options[0] || null;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSurface = theme === "surface";

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-2 ${className}`} title={title}>
      {label && (
        <div className={`text-[11px] tracking-widest uppercase ${
          isSurface ? 'text-slate-500' : 'text-cyan-100/70'
        }`}>
          {label}
        </div>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 rounded-full border px-3 py-1 text-xs outline-none transition-all ${
          isSurface 
            ? 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 focus:border-slate-400 shadow-sm'
            : 'border-cyan-300/15 bg-slate-950/40 text-cyan-50 hover:bg-slate-950/60 focus:border-cyan-300/40 shadow-[0_0_10px_rgba(34,211,238,0.05)]'
        }`}
      >
        <span>{displayOption?.label || selectedOption?.label || (options.length > 0 ? options[0].label : "Select...")}</span>
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${
          isSurface ? 'text-slate-400' : 'text-cyan-200/50'
        } ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 top-full z-[100] mt-2 min-w-[160px] overflow-hidden rounded-2xl border backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
          isSurface
            ? 'border-slate-300 bg-white p-1 shadow-xl'
            : 'border-cyan-500/30 bg-slate-950/80 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(34,211,238,0.1)]'
        }`}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs transition-all ${
                value === option.value
                  ? isSurface
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-cyan-500/20 text-cyan-50 shadow-[inset_0_0_10px_rgba(34,211,238,0.2)]"
                  : isSurface
                    ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    : "text-cyan-100/70 hover:bg-white/5 hover:text-cyan-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

