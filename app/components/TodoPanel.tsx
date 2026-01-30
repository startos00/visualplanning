"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  ListTodo,
  X,
  Filter,
  ChevronDown,
  ChevronRight,
  Target,
  Calendar,
} from "lucide-react";
import type { Node, Edge } from "reactflow";
import type { GrimpoNodeData } from "@/app/lib/graph";

type TodoPanelProps = {
  nodes: Node<GrimpoNodeData>[];
  edges: Edge[];
  onUpdateNode: (id: string, patch: Partial<GrimpoNodeData>) => void;
  onClose: () => void;
  onFocusNode?: (id: string) => void;
  theme?: "abyss" | "surface";
};

type FilterType = "all" | "pending" | "done";

type GroupedTasks = {
  strategyId: string | null;
  strategyTitle: string;
  tasks: Node<GrimpoNodeData>[];
};

export function TodoPanel({
  nodes,
  edges,
  onUpdateNode,
  onClose,
  onFocusNode,
  theme = "abyss",
}: TodoPanelProps) {
  const isSurface = theme === "surface";
  const [filter, setFilter] = useState<FilterType>("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Get all tactical nodes
  const tacticalNodes = useMemo(
    () => nodes.filter((n) => n.type === "tactical"),
    [nodes]
  );

  // Get all strategy nodes for grouping
  const strategyNodes = useMemo(
    () => nodes.filter((n) => n.type === "strategy"),
    [nodes]
  );

  // Build a map of tactical node id -> strategy node id
  const tacticalToStrategy = useMemo(() => {
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

  // Group tasks by strategy
  const groupedTasks = useMemo(() => {
    const groups = new Map<string | null, Node<GrimpoNodeData>[]>();

    tacticalNodes.forEach((node) => {
      const strategyId = tacticalToStrategy.get(node.id) || null;
      if (!groups.has(strategyId)) {
        groups.set(strategyId, []);
      }
      groups.get(strategyId)!.push(node);
    });

    const result: GroupedTasks[] = [];

    // Add grouped tasks (with strategy)
    strategyNodes.forEach((strategy) => {
      const tasks = groups.get(strategy.id);
      if (tasks && tasks.length > 0) {
        result.push({
          strategyId: strategy.id,
          strategyTitle: strategy.data.title || "Untitled Strategy",
          tasks,
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
  }, [tacticalNodes, strategyNodes, tacticalToStrategy]);

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
  const totalTasks = tacticalNodes.length;
  const completedTasks = tacticalNodes.filter(
    (n) => n.data.status === "done"
  ).length;
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

  const toggleTask = (nodeId: string, currentStatus?: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    onUpdateNode(nodeId, { status: newStatus });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`fixed right-4 top-20 z-[100] w-[340px] max-h-[calc(100vh-120px)] rounded-2xl border shadow-xl flex flex-col overflow-hidden ${
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
        <div className="flex items-center gap-2">
          <ListTodo
            className={`h-5 w-5 ${isSurface ? "text-slate-600" : "text-cyan-400"}`}
          />
          <h2
            className={`text-sm font-semibold ${
              isSurface ? "text-slate-800" : "text-cyan-50"
            }`}
          >
            To-Do List
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs ${
              isSurface ? "text-slate-500" : "text-cyan-200/60"
            }`}
          >
            {completedTasks}/{totalTasks}
          </span>
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
      </div>

      {/* Filter tabs */}
      <div
        className={`flex-shrink-0 flex items-center gap-1 px-3 py-2 border-b ${
          isSurface ? "border-slate-100 bg-slate-50/50" : "border-cyan-500/10"
        }`}
      >
        <Filter
          className={`h-3.5 w-3.5 mr-1 ${
            isSurface ? "text-slate-400" : "text-cyan-300/40"
          }`}
        />
        {(["all", "pending", "done"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
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
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {filteredGroups.length === 0 ? (
          <div
            className={`text-center py-8 text-sm ${
              isSurface ? "text-slate-400" : "text-cyan-300/40"
            }`}
          >
            {filter === "all"
              ? "No tasks yet. Generate a plan to see tasks here."
              : filter === "pending"
                ? "No pending tasks!"
                : "No completed tasks yet."}
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
                    ? "border-slate-200 bg-slate-50"
                    : "border-cyan-500/10 bg-slate-900/30"
                }`}
              >
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(group.strategyId)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                    isSurface ? "hover:bg-slate-100" : "hover:bg-cyan-500/10"
                  }`}
                >
                  {isCollapsed ? (
                    <ChevronRight
                      className={`h-3.5 w-3.5 ${
                        isSurface ? "text-slate-400" : "text-cyan-300/50"
                      }`}
                    />
                  ) : (
                    <ChevronDown
                      className={`h-3.5 w-3.5 ${
                        isSurface ? "text-slate-400" : "text-cyan-300/50"
                      }`}
                    />
                  )}
                  {group.strategyId ? (
                    <Target
                      className={`h-3.5 w-3.5 ${
                        isSurface ? "text-rose-500" : "text-rose-400"
                      }`}
                    />
                  ) : null}
                  <span
                    className={`flex-1 text-xs font-medium truncate ${
                      isSurface ? "text-slate-700" : "text-cyan-100"
                    }`}
                  >
                    {group.strategyTitle}
                  </span>
                  <span
                    className={`text-[10px] ${
                      isSurface ? "text-slate-400" : "text-cyan-300/40"
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
                          isSurface ? "border-slate-200" : "border-cyan-500/10"
                        }`}
                      >
                        {group.tasks.map((task) => {
                          const isDone = task.data.status === "done";
                          return (
                            <div
                              key={task.id}
                              className={`flex items-start gap-2 px-3 py-2 transition-colors ${
                                isSurface
                                  ? "hover:bg-slate-100"
                                  : "hover:bg-cyan-500/5"
                              }`}
                            >
                              <button
                                onClick={() =>
                                  toggleTask(task.id, task.data.status)
                                }
                                className={`flex-shrink-0 mt-0.5 ${
                                  isDone
                                    ? isSurface
                                      ? "text-emerald-500"
                                      : "text-emerald-400"
                                    : isSurface
                                      ? "text-slate-300 hover:text-slate-400"
                                      : "text-cyan-500/30 hover:text-cyan-400/50"
                                }`}
                              >
                                {isDone ? (
                                  <CheckCircle2 className="h-4 w-4" />
                                ) : (
                                  <Circle className="h-4 w-4" />
                                )}
                              </button>
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => onFocusNode?.(task.id)}
                              >
                                <p
                                  className={`text-xs leading-relaxed ${
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
                                  <p
                                    className={`text-[10px] mt-0.5 font-medium ${
                                      isSurface
                                        ? "text-amber-600"
                                        : "text-amber-400/70"
                                    }`}
                                  >
                                    {task.data.planDeadline}
                                  </p>
                                )}
                              </div>
                              {/* Deadline input */}
                              <div
                                className="flex-shrink-0 relative"
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
                                  className={`w-[100px] h-6 rounded-md border text-[10px] px-1.5 outline-none transition-colors ${
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

      {/* Progress bar */}
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
              Progress
            </span>
            <span
              className={`text-[10px] font-bold ${
                isSurface ? "text-slate-600" : "text-cyan-200"
              }`}
            >
              {totalTasks > 0
                ? Math.round((completedTasks / totalTasks) * 100)
                : 0}
              %
            </span>
          </div>
          <div
            className={`h-2 rounded-full overflow-hidden ${
              isSurface ? "bg-slate-200" : "bg-slate-800"
            }`}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
              }}
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
