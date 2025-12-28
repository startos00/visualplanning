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
};

export function AbyssalDropdown({
  options,
  value,
  onChange,
  label,
  className = "",
  title,
}: AbyssalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-2 ${className}`} title={title}>
      {label && <div className="text-[11px] tracking-widest text-cyan-100/70 uppercase">{label}</div>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 rounded-full border border-cyan-300/15 bg-slate-950/40 px-3 py-1 text-xs text-cyan-50 outline-none hover:bg-slate-950/60 focus:border-cyan-300/40 transition-all shadow-[0_0_10px_rgba(34,211,238,0.05)]"
      >
        <span>{selectedOption?.label || "Select..."}</span>
        <ChevronDown className={`h-3 w-3 text-cyan-200/50 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-[100] mt-2 min-w-[160px] overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(34,211,238,0.1)] backdrop-blur-md animate-in fade-in zoom-in-95 duration-100">
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
                  ? "bg-cyan-500/20 text-cyan-50 shadow-[inset_0_0_10px_rgba(34,211,238,0.2)]"
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

