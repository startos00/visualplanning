"use client";

import { motion, AnimatePresence } from "framer-motion";

type OrchestratorStatusBarProps = {
  status: string | null;
  theme?: "abyss" | "surface";
};

export function OrchestratorStatusBar({ status, theme = "abyss" }: OrchestratorStatusBarProps) {
  const isSurface = theme === "surface";

  return (
    <AnimatePresence>
      {status && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
            isSurface
              ? "bg-purple-50 text-purple-700 border border-purple-200"
              : "bg-purple-900/30 text-purple-200 border border-purple-500/20"
          }`}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
          />
          <span>{status}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
