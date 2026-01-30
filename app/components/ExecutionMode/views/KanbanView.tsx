"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Circle,
  PlayCircle,
  CheckCircle2,
  Target,
  GripVertical,
} from "lucide-react";
import type { Node } from "reactflow";
import type { GrimpoNodeData, TacticalStatus } from "@/app/lib/graph";

type KanbanViewProps = {
  tasks: Node<GrimpoNodeData>[];
  strategies: Node<GrimpoNodeData>[];
  taskToStrategy: Map<string, string>;
  onStatusChange: (taskId: string, newStatus: TacticalStatus) => void;
  onFocusTask: (taskId: string) => void;
  theme?: "abyss" | "surface";
};

type Column = {
  id: TacticalStatus;
  title: string;
  icon: typeof Circle;
  color: string;
  bgColor: string;
};

export function KanbanView({
  tasks,
  strategies,
  taskToStrategy,
  onStatusChange,
  onFocusTask,
  theme = "abyss",
}: KanbanViewProps) {
  const isSurface = theme === "surface";
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TacticalStatus | null>(null);

  const columns: Column[] = [
    {
      id: "todo",
      title: "To Do",
      icon: Circle,
      color: isSurface ? "text-slate-500" : "text-cyan-300/50",
      bgColor: isSurface ? "bg-slate-50" : "bg-slate-900/30",
    },
    {
      id: "in_progress",
      title: "In Progress",
      icon: PlayCircle,
      color: isSurface ? "text-amber-600" : "text-amber-400",
      bgColor: isSurface ? "bg-amber-50" : "bg-amber-500/10",
    },
    {
      id: "done",
      title: "Done",
      icon: CheckCircle2,
      color: isSurface ? "text-emerald-600" : "text-emerald-400",
      bgColor: isSurface ? "bg-emerald-50" : "bg-emerald-500/10",
    },
  ];

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const groups: Record<TacticalStatus, Node<GrimpoNodeData>[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    tasks.forEach((task) => {
      const status = task.data.status || "todo";
      // Handle legacy status values
      if (status === "todo" || status === "in_progress" || status === "done") {
        groups[status].push(task);
      } else {
        groups.todo.push(task);
      }
    });

    return groups;
  }, [tasks]);

  // Get strategy title for a task
  const getStrategyTitle = (taskId: string) => {
    const strategyId = taskToStrategy.get(taskId);
    if (!strategyId) return null;
    const strategy = strategies.find((s) => s.id === strategyId);
    return strategy?.data.title;
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: TacticalStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, columnId: TacticalStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) {
      onStatusChange(taskId, columnId);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 overflow-x-auto p-4"
    >
      <div className="flex gap-4 min-w-max h-full">
        {columns.map((column) => {
          const columnTasks = tasksByStatus[column.id];
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className="flex flex-col w-[280px] flex-shrink-0"
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column header */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-t-xl ${column.bgColor}`}
              >
                <column.icon className={`h-4 w-4 ${column.color}`} />
                <h3
                  className={`text-sm font-semibold ${
                    isSurface ? "text-slate-700" : "text-cyan-100"
                  }`}
                >
                  {column.title}
                </h3>
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    isSurface
                      ? "bg-slate-200 text-slate-600"
                      : "bg-slate-800 text-cyan-300/70"
                  }`}
                >
                  {columnTasks.length}
                </span>
              </div>

              {/* Column content */}
              <div
                className={`flex-1 p-2 rounded-b-xl border-2 border-t-0 transition-colors min-h-[200px] ${
                  isOver
                    ? isSurface
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-emerald-500/50 bg-emerald-500/10"
                    : isSurface
                      ? "border-slate-200 bg-white"
                      : "border-cyan-500/10 bg-slate-900/20"
                }`}
              >
                <div className="space-y-2">
                  {columnTasks.map((task) => {
                    const strategyTitle = getStrategyTitle(task.id);
                    const isDragging = draggedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onFocusTask(task.id)}
                        className={`group rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all ${
                          isDragging
                            ? "opacity-50 scale-95"
                            : isSurface
                              ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                              : "border-cyan-500/10 bg-slate-900/50 hover:border-cyan-500/20 hover:bg-slate-900/70"
                        }`}
                      >
                        {/* Drag handle */}
                        <div className="flex items-start gap-2">
                          <GripVertical
                            className={`h-4 w-4 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                              isSurface
                                ? "text-slate-300"
                                : "text-cyan-500/30"
                            }`}
                          />

                          <div className="flex-1 min-w-0">
                            {/* Task title */}
                            <p
                              className={`text-sm font-medium ${
                                column.id === "done"
                                  ? isSurface
                                    ? "text-slate-400 line-through"
                                    : "text-cyan-300/30 line-through"
                                  : isSurface
                                    ? "text-slate-700"
                                    : "text-cyan-100"
                              }`}
                            >
                              {task.data.title || "Untitled task"}
                            </p>

                            {/* Metadata */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {task.data.planDeadline && (
                                <span
                                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                    isSurface
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  {task.data.planDeadline}
                                </span>
                              )}
                              {strategyTitle && (
                                <span
                                  className={`text-[10px] flex items-center gap-1 ${
                                    isSurface
                                      ? "text-rose-600"
                                      : "text-rose-400/70"
                                  }`}
                                >
                                  <Target className="h-2.5 w-2.5" />
                                  {strategyTitle}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Empty state */}
                  {columnTasks.length === 0 && (
                    <div
                      className={`text-center py-8 text-xs ${
                        isSurface ? "text-slate-400" : "text-cyan-300/30"
                      }`}
                    >
                      {isOver ? (
                        <p>Drop here</p>
                      ) : (
                        <p>No tasks</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
