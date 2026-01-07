"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PencilLine, Sparkles, Target, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

type CreationDockProps = {
  theme: "abyss" | "surface";
  isDrawingMode: boolean;
  onToggleDrawingMode: () => void;
  onDoneDrawing: () => void;
  handleAddNode: (type: "strategy" | "tactical" | "resource") => void;
};

export function CreationDock({
  theme,
  isDrawingMode,
  onToggleDrawingMode,
  onDoneDrawing,
  handleAddNode,
}: CreationDockProps) {
  const [open, setOpen] = useState(false);

  // If drawing mode flips on externally, ensure the menu is collapsed.
  useEffect(() => {
    if (isDrawingMode) setOpen(false);
  }, [isDrawingMode]);

  const isSurface = theme === "surface";

  const panelClasses = isSurface
    ? "border-slate-300 bg-white/90 shadow-xl"
    : "border-cyan-300/20 bg-slate-950/50 shadow-[0_0_24px_rgba(34,211,238,0.18)]";

  const mainButtonClasses = isSurface
    ? "border-slate-300 bg-slate-900 text-white shadow-lg hover:bg-slate-800"
    : "border-cyan-300/25 bg-cyan-500/15 text-cyan-50 shadow-[0_0_26px_rgba(34,211,238,0.35)]";

  const itemButtonClasses = isSurface
    ? "text-slate-700 hover:bg-slate-100"
    : "text-cyan-100 hover:bg-white/5";

  return (
    <div className="pointer-events-none fixed bottom-6 right-24 z-50">
      <div className="pointer-events-auto relative flex flex-col items-end">
        <AnimatePresence initial={false}>
          {open && !isDrawingMode ? (
            <motion.div
              key="creationdock-menu"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              className={`mb-3 flex flex-col gap-2 rounded-3xl border p-2 backdrop-blur-md ${panelClasses}`}
            >
              <button
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-left text-sm transition-colors ${itemButtonClasses}`}
                onClick={() => {
                  onToggleDrawingMode();
                }}
              >
                <PencilLine className="h-4 w-4" />
                Sketch
              </button>
              <button
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-left text-sm transition-colors ${itemButtonClasses}`}
                onClick={() => {
                  handleAddNode("strategy");
                  setOpen(false);
                }}
              >
                <Target className="h-4 w-4" />
                Strategy
              </button>
              <button
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-left text-sm transition-colors ${itemButtonClasses}`}
                onClick={() => {
                  handleAddNode("tactical");
                  setOpen(false);
                }}
              >
                <Wrench className="h-4 w-4" />
                Tactical
              </button>
              <button
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-left text-sm transition-colors ${itemButtonClasses}`}
                onClick={() => {
                  handleAddNode("resource");
                  setOpen(false);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Resource
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {isDrawingMode ? (
            <motion.button
              key="creationdock-done"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              onClick={onDoneDrawing}
              className={[
                "rounded-full border px-5 py-3 text-xs font-semibold tracking-wide backdrop-blur-md transition-all hover:scale-[1.02]",
                isSurface
                  ? "border-cyan-500/30 bg-cyan-600 text-white shadow-md hover:bg-cyan-700"
                  : "border-cyan-300/30 bg-cyan-400/20 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.35)] hover:bg-cyan-400/25",
              ].join(" ")}
              title="Done drawing"
            >
              DONE DRAWING
            </motion.button>
          ) : (
            <motion.button
              key="creationdock-plus"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.16 }}
              onClick={() => setOpen((v) => !v)}
              className={`grid h-14 w-14 place-items-center rounded-full border backdrop-blur-md transition-all hover:scale-[1.03] ${mainButtonClasses}`}
              title="Create"
            >
              <span className="text-2xl leading-none">+</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


