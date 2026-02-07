"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  Target,
  Filter,
  ListTodo,
} from "lucide-react";
import type { Node } from "reactflow";
import type { GrimpoNodeData } from "@/app/lib/graph";

type ListViewProps = {
  tasks: Node<GrimpoNodeData>[];
  strategies: Node<GrimpoNodeData>[];
  taskToStrategy: Map<string, string>;
  onToggleTask: (taskId: string, currentStatus?: string) => void;
  onFocusTask: (taskId: string) => void;
  onUpdateNode: (id: string, patch: Partial<GrimpoNodeData>) => void;
  theme?: "abyss" | "surface";
};

type FilterType = "all" | "pending" | "done";

type GroupedTasks = {
  strategyId: string | null;
  strategyTitle: string;
  tasks: Node<GrimpoNodeData>[];
};

export function ListView({
  tasks,
  strategies,
  taskToStrategy,
  onToggleTask,
  onFocusTask,
  onUpdateNode,
  theme = "abyss",
}: ListViewProps) {
  const isSurface = theme === "surface";
  const [filter, setFilter] = useState<FilterType>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Group tasks by strategy
  const groupedTasks = useMemo(() => {
    const groups = new Map<string | null, Node<GrimpoNodeData>[]>();

    tasks.forEach((task) => {
      const strategyId = taskToStrategy.get(task.id) || null;
      if (!groups.has(strategyId)) {
        groups.set(strategyId, []);
      }
      groups.get(strategyId)!.push(task);
    });

    const result: GroupedTasks[] = [];

    // Add grouped tasks (with strategy)
    strategies.forEach((strategy) => {
      const strategyTasks = groups.get(strategy.id);
      if (strategyTasks && strategyTasks.length > 0) {
        // Sort by planDeadline
        strategyTasks.sort((a, b) => {
          const aDeadline = a.data.planDeadline || "";
          const bDeadline = b.data.planDeadline || "";
          return aDeadline.localeCompare(bDeadline);
        });
        result.push({
          strategyId: strategy.id,
          strategyTitle: strategy.data.title || "Untitled Strategy",
          tasks: strategyTasks,
        });
      }
    });

    // Add ungrouped tasks
    const ungrouped = groups.get(null);
    if (ungrouped && ungrouped.length > 0) {
      result.push({
        strategyId: null,
        strategyTitle: "Standalone Tasks",
        tasks: ungrouped,
      });
    }

    return result;
  }, [tasks, strategies, taskToStrategy]);

  // Filter tasks
  const filteredGroups = useMemo(() => {
    if (filter === "all") return groupedTasks;

    return groupedTasks
      .map((group) => ({
        ...group,
        tasks: group.tasks.filter((task) =>
          filter === "done"
            ? task.data.status === "done"
            : task.data.status !== "done"
        ),
      }))
      .filter((group) => group.tasks.length > 0);
  }, [groupedTasks, filter]);

  // Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.data.status === "done").length;
  const pendingTasks = totalTasks - completedTasks;

  const toggleGroup = (strategyId: string | null) => {
    const key = strategyId || "ungrouped";
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col overflow-hidden"
    >
      {/* Filter tabs */}
      <div
        className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 border-b ${
          isSurface ? "border-slate-100 bg-slate-50/50" : "border-cyan-500/10"
        }`}
      >
        <Filter
          className={`h-4 w-4 ${isSurface ? "text-slate-400" : "text-cyan-300/40"}`}
        />
        {(["all", "pending", "done"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? isSurface
                  ? "bg-slate-200 text-slate-800"
                  : "bg-cyan-500/20 text-cyan-100"
                : isSurface
                  ? "text-slate-500 hover:bg-slate-100"
                  : "text-cyan-300/50 hover:bg-cyan-500/10"
            }`}
          >
            {f === "all" && `All (${totalTasks})`}
            {f === "pending" && `Pending (${pendingTasks})`}
            {f === "done" && `Done (${completedTasks})`}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredGroups.length === 0 ? (
          <div
            className={`text-center py-12 ${
              isSurface ? "text-slate-400" : "text-cyan-300/40"
            }`}
          >
            <ListTodo className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>
              {filter === "all"
                ? "No tasks yet. Generate a plan to see tasks here."
                : filter === "pending"
                  ? "No pending tasks!"
                  : "No completed tasks yet."}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const groupKey = group.strategyId || "ungrouped";
            const isCollapsed = collapsedGroups.has(groupKey);
            const groupDone = group.tasks.filter(
              (t) => t.data.status === "done"
            ).length;

            return (
              <div
                key={groupKey}
                className={`rounded-xl border overflow-hidden ${
                  isSurface
                    ? "border-slate-200 bg-white"
                    : "border-cyan-500/10 bg-slate-900/30"
                }`}
              >
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.strategyId)}
                  className={`w-full flex items-center gap-2 px-4 py-3 text-left transition-colors ${
                    isSurface ? "hover:bg-slate-50" : "hover:bg-cyan-500/5"
                  }`}
                >
                  {isCollapsed ? (
                    <ChevronRight
                      className={`h-4 w-4 ${
                        isSurface ? "text-slate-400" : "text-cyan-300/50"
                      }`}
                    />
                  ) : (
                    <ChevronDown
                      className={`h-4 w-4 ${
                        isSurface ? "text-slate-400" : "text-cyan-300/50"
                      }`}
                    />
                  )}
                  {group.strategyId && (
                    <Target
                      className={`h-4 w-4 ${
                        isSurface ? "text-rose-500" : "text-rose-400"
                      }`}
                    />
                  )}
                  <span
                    className={`flex-1 text-sm font-semibold ${
                      isSurface ? "text-slate-700" : "text-cyan-100"
                    }`}
                  >
                    {group.strategyTitle}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isSurface
                        ? "bg-slate-100 text-slate-500"
                        : "bg-slate-800 text-cyan-300/60"
                    }`}
                  >
                    {groupDone}/{group.tasks.length}
                  </span>
                </button>

                {/* Tasks */}
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div
                        className={`border-t ${
                          isSurface ? "border-slate-100" : "border-cyan-500/10"
                        }`}
                      >
                        {group.tasks.map((task) => {
                          const isDone = task.data.status === "done";
                          return (
                            <div
                              key={task.id}
                              className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
                                isSurface
                                  ? "hover:bg-slate-50"
                                  : "hover:bg-cyan-500/5"
                              }`}
                              onClick={() => onFocusTask(task.id)}
                            >
                              {/* Checkbox */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTask(task.id, task.data.status);
                                }}
                                className={`flex-shrink-0 mt-0.5 transition-colors ${
                                  isDone
                                    ? isSurface
                                      ? "text-emerald-500"
                                      : "text-emerald-400"
                                    : isSurface
                                      ? "text-slate-300 hover:text-emerald-500"
                                      : "text-cyan-500/30 hover:text-emerald-400"
                                }`}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                  <Circle className="h-5 w-5" />
                                )}
                              </button>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm ${
                                    isDone
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
                                {task.data.planDeadline && (
                                  <span
                                    className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                      isSurface
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-amber-500/20 text-amber-300"
                                    }`}
                                  >
                                    {task.data.planDeadline}
                                  </span>
                                )}
                              </div>

                              {/* Deadline input */}
                              <div
                                className="flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="date"
                                  value={task.data.deadline || ""}
                                  onChange={(e) => {
                                    onUpdateNode(task.id, {
                                      deadline: e.target.value || undefined,
                                    });
                                  }}
                                  className={`w-[110px] h-7 rounded-md border text-xs px-2 outline-none transition-colors ${
                                    isSurface
                                      ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300 focus:border-slate-400"
                                      : "border-cyan-500/20 bg-slate-800/50 text-cyan-200/70 hover:border-cyan-500/30 focus:border-cyan-400/50"
                                  } ${
                                    task.data.deadline
                                      ? ""
                                      : isSurface
                                        ? "text-slate-400"
                                        : "text-cyan-300/30"
                                  }`}
                                  title="Set deadline"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
