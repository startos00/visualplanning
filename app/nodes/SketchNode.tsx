"use client";

import type { NodeProps } from "reactflow";
import { Handle, Position, NodeResizer } from "reactflow";
import { X, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type SketchNodeData = {
  image: string; // dataUrl
  width: number;
  height: number;
  locked?: boolean;
  isTrace?: boolean;
  sonarOpacity?: number;
  onUpdate?: (id: string, patch: Partial<SketchNodeData>) => void;
  onDelete?: (id: string) => void;
};

export function SketchNode({ id, data, selected }: NodeProps<SketchNodeData>) {
  const isTrace = !!data.isTrace;
  const sonarOpacity = data.sonarOpacity ?? 0.2;
  const [hovered, setHovered] = useState(false);
  const isLocked = !!data.locked;

  if (isTrace) {
    return (
      <div 
        className="w-full h-full rounded-2xl border border-dashed flex items-center justify-center pointer-events-none"
        style={{
          borderColor: `rgba(34, 211, 238, ${sonarOpacity})`,
          backgroundColor: `rgba(34, 211, 238, ${sonarOpacity * 0.1})`,
        }}
      >
        <span 
          className="text-[10px] font-bold tracking-widest uppercase"
          style={{ color: `rgba(34, 211, 238, ${sonarOpacity * 2})` }}
        >
          Sketch Trace
        </span>
      </div>
    );
  }

  return (
    <>
      {!isLocked && (
        <NodeResizer 
          isVisible={selected} 
          minWidth={50} 
          minHeight={50} 
          handleStyle={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22d3ee' }}
          lineStyle={{ border: '1px solid #22d3ee' }}
        />
      )}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        className={`relative group w-full h-full ${!isLocked ? 'drag-handle cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* The actual drawing */}
        <img 
          src={data.image} 
          alt="Sketch" 
          className={`w-full h-full object-contain transition-all ${selected ? 'drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]' : ''} ${isLocked ? 'opacity-80' : 'opacity-100'}`}
          draggable={false}
        />

        {/* Control buttons (only visible on hover or selection) */}
        <AnimatePresence>
          {(hovered || selected) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute -top-10 right-0 flex gap-2"
            >
              {/* Lock Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  data.onUpdate?.(id, { locked: !isLocked });
                }}
                className={`p-1.5 rounded-full border backdrop-blur-md transition-colors ${
                  isLocked 
                    ? "bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500" 
                    : "bg-slate-800/40 text-cyan-200 border-cyan-500/30 hover:bg-slate-700"
                }`}
                title={isLocked ? "Unlock sketch" : "Lock sketch position"}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>

              {/* Delete Button */}
              {!isLocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onDelete?.(id);
                  }}
                  className="p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-100 rounded-full border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)] backdrop-blur-md transition-colors"
                  title="Delete sketch"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invisible handles to allow connecting to sketches if desired */}
        <Handle type="target" position={Position.Left} className="opacity-0" />
        <Handle type="source" position={Position.Right} className="opacity-0" />
      </motion.div>
    </>
  );
}

