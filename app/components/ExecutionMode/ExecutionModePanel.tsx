"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  List,
  Calendar,
  Columns3,
  Target,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Node, Edge } from "reactflow";
import type { GrimpoNodeData } from "@/app/lib/graph";
import { ListView } from "./views/ListView";
import { TodayView } from "./views/TodayView";
import { KanbanView } from "./views/KanbanView";
import { FocusView } from "./views/FocusView";

type ViewType = "list" | "today" | "kanban" | "focus";

type ExecutionModePanelProps = {
  nodes: Node<GrimpoNodeData>[];
  edges: Edge[];
  onUpdateNode: (id: string, patch: Partial<GrimpoNodeData>) => void;
  onClose: () => void;
  onFocusNode?: (id: string) => void;
  theme?: "abyss" | "surface";
};

const VIEW_CONFIG: { id: ViewType; icon: typeof List; label: string }[] = [
  { id: "focus", icon: Target, label: "Focus" },
  { id: "today", icon: Calendar, label: "Today" },
  { id: "kanban", icon: Columns3, label: "Kanban" },
  { id: "list", icon: List, label: "List" },
];

export function ExecutionModePanel({
  nodes,
  edges,
  onUpdateNode,
  onClose,
  onFocusNode,
  theme = "abyss",
}: ExecutionModePanelProps) {
  const isSurface = theme === "surface";
  const [activeView, setActiveView] = useState<ViewType>("focus");
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  // Get all tactical nodes (tasks)
  const tasks = useMemo(
    () => nodes.filter((n) => n.type === "tactical"),
    [nodes]
  );

  // Get strategy nodes for grouping
  const strategies = useMemo(
    () => nodes.filter((n) => n.type === "strategy"),
    [nodes]
  );

  // Build task -> strategy mapping
  const taskToStrategy = useMemo(() => {
    const map = new Map<string, string>();
    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (sourceNode?.type === "strategy" && targetNode?.type === "tactical") {
        map.set(edge.target, edge.source);
      }
    });
    return map;
  }, [edges, nodes]);

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((n) => n.data.status === "done").length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Handle task focus from any view
  const handleTaskFocus = useCallback((taskId: string) => {
    setFocusedTaskId(taskId);
    setActiveView("focus");
  }, []);

  // Handle task completion
  const handleToggleTask = useCallback(
    (taskId: string, currentStatus?: string) => {
      const newStatus = currentStatus === "done" ? "todo" : "done";
      onUpdateNode(taskId, { status: newStatus });
    },
    [onUpdateNode]
  );

  // Handle status change (for kanban)
  const handleStatusChange = useCallback(
    (taskId: string, newStatus: "todo" | "in_progress" | "done") => {
      onUpdateNode(taskId, { status: newStatus });
    },
    [onUpdateNode]
  );

  // Navigate focus view
  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.data.status !== "done"),
    [tasks]
  );

  const currentFocusIndex = useMemo(() => {
    if (!focusedTaskId) return 0;
    const idx = pendingTasks.findIndex((t) => t.id === focusedTaskId);
    return idx >= 0 ? idx : 0;
  }, [focusedTaskId, pendingTasks]);

  const handleFocusNext = useCallback(() => {
    const nextIndex = (currentFocusIndex + 1) % pendingTasks.length;
    setFocusedTaskId(pendingTasks[nextIndex]?.id || null);
  }, [currentFocusIndex, pendingTasks]);

  const handleFocusPrev = useCallback(() => {
    const prevIndex = (currentFocusIndex - 1 + pendingTasks.length) % pendingTasks.length;
    setFocusedTaskId(pendingTasks[prevIndex]?.id || null);
  }, [currentFocusIndex, pendingTasks]);

  // Current focused task
  const focusedTask = useMemo(() => {
    if (focusedTaskId) {
      return pendingTasks.find((t) => t.id === focusedTaskId) || pendingTasks[0];
    }
    return pendingTasks[0];
  }, [focusedTaskId, pendingTasks]);

  // Get strategy for focused task
  const focusedTaskStrategy = useMemo(() => {
    if (!focusedTask) return null;
    const strategyId = taskToStrategy.get(focusedTask.id);
    return strategyId ? strategies.find((s) => s.id === strategyId) ?? null : null;
  }, [focusedTask, taskToStrategy, strategies]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed inset-x-4 bottom-4 top-20 z-[100] mx-auto max-w-4xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
        isSurface
          ? "border-slate-200 bg-white"
          : "border-cyan-500/20 bg-slate-950/95 backdrop-blur-md"
      }`}
    >
      {/* Header */}
      <div
        className={`flex-shrink-0 flex items-center justify-between border-b px-4 py-3 ${
          isSurface
            ? "border-slate-200 bg-slate-50"
            : "border-cyan-500/20 bg-slate-900/50"
        }`}
      >
        <div className="flex items-center gap-3">
          <Target
            className={`h-5 w-5 ${isSurface ? "text-emerald-600" : "text-emerald-400"}`}
          />
          <h2
            className={`text-sm font-semibold ${
              isSurface ? "text-slate-800" : "text-cyan-50"
            }`}
          >
            Execution Mode
          </h2>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              isSurface
                ? "bg-slate-200 text-slate-600"
                : "bg-cyan-500/20 text-cyan-200"
            }`}
          >
            {completedTasks}/{totalTasks} tasks
          </span>
        </div>

        {/* View tabs */}
        <div className="flex items-center gap-1">
          {VIEW_CONFIG.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeView === view.id
                  ? isSurface
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-emerald-500/20 text-emerald-300"
                  : isSurface
                    ? "text-slate-500 hover:bg-slate-100"
                    : "text-cyan-300/50 hover:bg-cyan-500/10"
              }`}
            >
              <view.icon className="h-3.5 w-3.5" />
              {view.label}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className={`rounded-full p-1.5 transition-colors ${
            isSurface
              ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              : "text-cyan-200/50 hover:bg-cyan-500/20 hover:text-cyan-200"
          }`}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === "focus" && (
            <FocusView
              key="focus"
              task={focusedTask}
              strategy={focusedTaskStrategy}
              currentIndex={currentFocusIndex}
              totalPending={pendingTasks.length}
              onComplete={() => focusedTask && handleToggleTask(focusedTask.id, focusedTask.data.status)}
              onSkip={handleFocusNext}
              onPrev={handleFocusPrev}
              onNext={handleFocusNext}
              onFocusOnCanvas={() => focusedTask && onFocusNode?.(focusedTask.id)}
              theme={theme}
            />
          )}
          {activeView === "today" && (
            <TodayView
              key="today"
              tasks={tasks}
              strategies={strategies}
              taskToStrategy={taskToStrategy}
              onToggleTask={handleToggleTask}
              onFocusTask={handleTaskFocus}
              onUpdateNode={onUpdateNode}
              theme={theme}
            />
          )}
          {activeView === "kanban" && (
            <KanbanView
              key="kanban"
              tasks={tasks}
              strategies={strategies}
              taskToStrategy={taskToStrategy}
              onStatusChange={handleStatusChange}
              onFocusTask={handleTaskFocus}
              theme={theme}
            />
          )}
          {activeView === "list" && (
            <ListView
              key="list"
              tasks={tasks}
              strategies={strategies}
              taskToStrategy={taskToStrategy}
              onToggleTask={handleToggleTask}
              onFocusTask={handleTaskFocus}
              onUpdateNode={onUpdateNode}
              theme={theme}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar footer */}
      {totalTasks > 0 && (
        <div
          className={`flex-shrink-0 px-4 py-3 border-t ${
            isSurface ? "border-slate-200 bg-slate-50" : "border-cyan-500/20"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`text-[10px] font-medium ${
                isSurface ? "text-slate-500" : "text-cyan-300/60"
              }`}
            >
              Overall Progress
            </span>
            <span
              className={`text-[10px] font-bold ${
                isSurface ? "text-slate-600" : "text-cyan-200"
              }`}
            >
              {progressPercent}%
            </span>
          </div>
          <div
            className={`h-2 rounded-full overflow-hidden ${
              isSurface ? "bg-slate-200" : "bg-slate-800"
            }`}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`h-full rounded-full ${
                isSurface
                  ? "bg-emerald-500"
                  : "bg-gradient-to-r from-cyan-500 to-emerald-500"
              }`}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
