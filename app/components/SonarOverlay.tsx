"use client";

import { useState, useRef, useEffect } from "react";
import { Radar, ChevronDown, X, Layers, MoveUp, MoveDown, MoveLeft, MoveRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Project = {
  id: string;
  name: string;
};

type SonarOverlayProps = {
  projects: Project[];
  currentProjectId: string;
  activeSonarId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onShiftSonar?: (dx: number, dy: number) => void;
  sonarOpacity: number;
  onOpacityChange: (opacity: number) => void;
  activeCanvasOpacity: number;
  onActiveCanvasOpacityChange: (opacity: number) => void;
  theme: "abyss" | "surface";
};

export function SonarOverlay({
  projects,
  currentProjectId,
  activeSonarId,
  onSelectProject,
  onShiftSonar,
  sonarOpacity,
  onOpacityChange,
  activeCanvasOpacity,
  onActiveCanvasOpacityChange,
  theme,
}: SonarOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const otherProjects = projects.filter((p) => p.id !== currentProjectId);
  const activeProject = projects.find((p) => p.id === activeSonarId);

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
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs tracking-wide backdrop-blur-md transition-all duration-300 ${
          activeSonarId
            ? theme === "surface"
              ? "border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm"
              : "border-cyan-400/50 bg-cyan-500/20 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.25)]"
            : theme === "surface"
              ? "border-slate-300 bg-white/80 text-slate-500 hover:text-slate-900 shadow-sm"
              : "border-cyan-300/20 bg-slate-950/40 text-cyan-100/70 hover:text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
        }`}
        title="The Sonar Overlay: Reference another project's canvas"
      >
        <Radar className={`h-3.5 w-3.5 ${activeSonarId ? "animate-pulse" : ""}`} />
        <span>{activeProject ? activeProject.name : "SONAR"}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className={`absolute right-0 mt-2 min-w-[220px] overflow-hidden rounded-2xl border p-1 backdrop-blur-xl shadow-2xl z-[100] ${
              theme === "surface"
                ? "border-slate-200 bg-white/95 text-slate-700"
                : "border-cyan-500/30 bg-slate-950/90 text-cyan-100"
            }`}
          >
            <div className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between ${theme === "surface" ? "text-slate-400" : "text-cyan-500/50"}`}>
              <span>Select Trace Project</span>
              {activeSonarId && (
                <button 
                  onClick={() => {
                    onSelectProject(null);
                    setIsOpen(false);
                  }}
                  className="hover:text-rose-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {activeSonarId && onShiftSonar && (
              <div className={`px-3 py-3 border-b ${theme === "surface" ? "border-slate-100" : "border-cyan-500/10"} bg-white/5`}>
                <div className="flex flex-col gap-4 mb-4">
                  {/* Reference Project Slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/80">Reference Project</div>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-500/70">{Math.round(sonarOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.8"
                      step="0.01"
                      value={sonarOpacity}
                      onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-cyan-900/30 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  {/* Current Project Slider */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-60">Current Project</div>
                      </div>
                      <span className="text-[10px] font-mono opacity-60">{Math.round(activeCanvasOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.01"
                      value={activeCanvasOpacity}
                      onChange={(e) => onActiveCanvasOpacityChange(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-700/30 rounded-lg appearance-none cursor-pointer accent-slate-400"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2 opacity-40">
                  <div className="h-px flex-1 bg-current" />
                  <div className="text-[8px] font-bold uppercase tracking-[0.2em]">Shift Trace</div>
                  <div className="h-px flex-1 bg-current" />
                </div>
                <div className="grid grid-cols-3 gap-1 w-24 mx-auto">
                  <div />
                  <button onClick={() => onShiftSonar(0, -50)} className="p-1 hover:bg-cyan-500/20 rounded transition-colors flex justify-center"><MoveUp size={12} /></button>
                  <div />
                  <button onClick={() => onShiftSonar(-50, 0)} className="p-1 hover:bg-cyan-500/20 rounded transition-colors flex justify-center"><MoveLeft size={12} /></button>
                  <div />
                  <button onClick={() => onShiftSonar(50, 0)} className="p-1 hover:bg-cyan-500/20 rounded transition-colors flex justify-center"><MoveRight size={12} /></button>
                  <div />
                  <button onClick={() => onShiftSonar(0, 50)} className="p-1 hover:bg-cyan-500/20 rounded transition-colors flex justify-center"><MoveDown size={12} /></button>
                  <div />
                </div>
              </div>
            )}

            {activeSonarId && (
              <div className={`px-3 py-2 border-b ${theme === "surface" ? "border-slate-100" : "border-cyan-500/10"}`}>
                <div className={`text-[9px] font-bold uppercase tracking-widest mb-2 opacity-50 flex justify-between`}>
                  <span>Trace Intensity</span>
                  <span>{Math.round(sonarOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.01"
                  value={sonarOpacity}
                  onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-cyan-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            )}

            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {otherProjects.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs opacity-50 italic">
                  No other sectors found
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      onSelectProject(null);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-xs transition-all ${
                      activeSonarId === null
                        ? theme === "surface"
                          ? "bg-slate-100 text-slate-900 font-semibold"
                          : "bg-cyan-500/20 text-cyan-50"
                        : theme === "surface"
                          ? "hover:bg-slate-50 text-slate-600"
                          : "hover:bg-white/5 text-cyan-100/70"
                    }`}
                  >
                    <X size={12} className="opacity-40" />
                    <span>None (Clear Overlay)</span>
                  </button>
                  
                  {otherProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        onSelectProject(project.id);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left text-xs transition-all ${
                        project.id === activeSonarId
                          ? theme === "surface"
                            ? "bg-cyan-100 text-cyan-900 font-semibold"
                            : "bg-cyan-500/30 text-cyan-50 shadow-[inset_0_0_10px_rgba(34,211,238,0.2)]"
                          : theme === "surface"
                            ? "hover:bg-slate-50 text-slate-600"
                            : "hover:bg-white/5 text-cyan-100/70 hover:text-cyan-50"
                      }`}
                    >
                      <Layers size={12} className={project.id === activeSonarId ? "text-cyan-400" : "opacity-40"} />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

