"use client";

import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import { X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type SketchNodeData = {
  image: string; // dataUrl
  width: number;
  height: number;
  onDelete?: (id: string) => void;
};

export function SketchNode({ id, data, selected }: NodeProps<SketchNodeData>) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      className="relative group drag-handle cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: data.width, height: data.height }}
    >
      {/* The actual drawing */}
      <img 
        src={data.image} 
        alt="Sketch" 
        className={`w-full h-full object-contain transition-all ${selected ? 'drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]' : ''}`}
        draggable={false}
      />

      {/* Delete button (only visible on hover or selection) */}
      <AnimatePresence>
        {(hovered || selected) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            onClick={() => data.onDelete?.(id)}
            className="absolute -top-4 -right-4 p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-100 rounded-full border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)] backdrop-blur-md transition-colors z-50"
            title="Delete sketch"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Invisible handles to allow connecting to sketches if desired */}
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </motion.div>
  );
}

