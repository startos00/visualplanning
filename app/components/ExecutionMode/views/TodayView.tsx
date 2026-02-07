"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Calendar,
  Clock,
  Target,
} from "lucide-react";
import type { Node } from "reactflow";
import type { GrimpoNodeData } from "@/app/lib/graph";

type TodayViewProps = {
  tasks: Node<GrimpoNodeData>[];
  strategies: Node<GrimpoNodeData>[];
  taskToStrategy: Map<string, string>;
  onToggleTask: (taskId: string, currentStatus?: string) => void;
  onFocusTask: (taskId: string) => void;
  onUpdateNode: (id: string, patch: Partial<GrimpoNodeData>) => void;
  theme?: "abyss" | "surface";
};

type TaskGroup = {
  id: string;
  title: string;
  icon: typeof AlertTriangle;
  tasks: Node<GrimpoNodeData>[];
  color: string;
};

export function TodayView({
  tasks,
  strategies,
  taskToStrategy,
  onToggleTask,
  onFocusTask,
  onUpdateNode,
  theme = "abyss",
}: TodayViewProps) {
  const isSurface = theme === "surface";

  // Get today's date string
  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }, []);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Get relative day description
  const getRelativeDay = (dateStr: string) => {
    const date = new Date(dateStr);
    const todayDate = new Date(today);
    const diffTime = date.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} ago`;
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `in ${diffDays} days`;
  };

  // Group tasks by date status
  const groupedTasks = useMemo(() => {
    const overdue: Node<GrimpoNodeData>[] = [];
    const todayTasks: Node<GrimpoNodeData>[] = [];
    const upcoming: Node<GrimpoNodeData>[] = [];
    const noDate: Node<GrimpoNodeData>[] = [];

    tasks.forEach((task) => {
      if (task.data.status === "done") return; // Skip completed

      const deadline = task.data.deadline;
      if (!deadline) {
        noDate.push(task);
        return;
      }

      if (deadline < today) {
        overdue.push(task);
      } else if (deadline === today) {
        todayTasks.push(task);
      } else {
        upcoming.push(task);
      }
    });

    // Sort each group by deadline
    const sortByDeadline = (a: Node<GrimpoNodeData>, b: Node<GrimpoNodeData>) => {
      const aDate = a.data.deadline || "";
      const bDate = b.data.deadline || "";
      return aDate.localeCompare(bDate);
    };

    overdue.sort(sortByDeadline);
    todayTasks.sort(sortByDeadline);
    upcoming.sort(sortByDeadline);

    const groups: TaskGroup[] = [];

    if (overdue.length > 0) {
      groups.push({
        id: "overdue",
        title: `Overdue (${overdue.length})`,
        icon: AlertTriangle,
        tasks: overdue,
        color: isSurface ? "text-red-600" : "text-red-400",
      });
    }

    if (todayTasks.length > 0) {
      groups.push({
        id: "today",
        title: `Today (${todayTasks.length})`,
        icon: Calendar,
        tasks: todayTasks,
        color: isSurface ? "text-emerald-600" : "text-emerald-400",
      });
    }

    if (upcoming.length > 0) {
      groups.push({
        id: "upcoming",
        title: `Upcoming (${upcoming.length})`,
        icon: Clock,
        tasks: upcoming,
        color: isSurface ? "text-blue-600" : "text-blue-400",
      });
    }

    if (noDate.length > 0) {
      groups.push({
        id: "nodate",
        title: `No Deadline (${noDate.length})`,
        icon: Circle,
        tasks: noDate,
        color: isSurface ? "text-slate-500" : "text-cyan-300/50",
      });
    }

    return groups;
  }, [tasks, today, isSurface]);

  // Completed tasks
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.data.status === "done"),
    [tasks]
  );

  // Get strategy title for a task
  const getStrategyTitle = (taskId: string) => {
    const strategyId = taskToStrategy.get(taskId);
    if (!strategyId) return null;
    const strategy = strategies.find((s) => s.id === strategyId);
    return strategy?.data.title;
  };

  // Today's formatted date
  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 overflow-y-auto p-4"
    >
      {/* Header */}
      <div className="mb-6">
        <h2
          className={`text-lg font-bold ${
            isSurface ? "text-slate-800" : "text-cyan-50"
          }`}
        >
          {todayFormatted}
        </h2>
        <p
          className={`text-sm ${
            isSurface ? "text-slate-500" : "text-cyan-300/50"
          }`}
        >
          {tasks.filter((t) => t.data.status !== "done").length} tasks pending
        </p>
      </div>

      {/* Task groups */}
      <div className="space-y-6">
        {groupedTasks.length === 0 && completedTasks.length === 0 ? (
          <div
            className={`text-center py-12 ${
              isSurface ? "text-slate-400" : "text-cyan-300/40"
            }`}
          >
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No tasks yet. Generate a plan to get started.</p>
          </div>
        ) : (
          <>
            {groupedTasks.map((group) => (
              <div key={group.id}>
                {/* Group header */}
                <div className="flex items-center gap-2 mb-3">
                  <group.icon className={`h-4 w-4 ${group.color}`} />
                  <h3
                    className={`text-sm font-semibold ${
                      isSurface ? "text-slate-700" : "text-cyan-100"
                    }`}
                  >
                    {group.title}
                  </h3>
                </div>

                {/* Tasks */}
                <div
                  className={`rounded-xl border overflow-hidden ${
                    isSurface
                      ? "border-slate-200 bg-white"
                      : "border-cyan-500/10 bg-slate-900/30"
                  }`}
                >
                  {group.tasks.map((task, idx) => {
                    const strategyTitle = getStrategyTitle(task.id);
                    return (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer ${
                          idx > 0
                            ? isSurface
                              ? "border-t border-slate-100"
                              : "border-t border-cyan-500/5"
                            : ""
                        } ${
                          isSurface ? "hover:bg-slate-50" : "hover:bg-cyan-500/5"
                        }`}
                        onClick={() => onFocusTask(task.id)}
                      >
                        {/* Checkbox */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTask(task.id, task.data.status);
                          }}
                          className={`flex-shrink-0 mt-0.5 ${
                            isSurface
                              ? "text-slate-300 hover:text-emerald-500"
                              : "text-cyan-500/30 hover:text-emerald-400"
                          }`}
                        >
                          <Circle className="h-5 w-5" />
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              isSurface ? "text-slate-700" : "text-cyan-100"
                            }`}
                          >
                            {task.data.title || "Untitled task"}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
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

                        {/* Deadline */}
                        <div className="flex-shrink-0 text-right">
                          {task.data.deadline ? (
                            <>
                              <p
                                className={`text-xs font-medium ${
                                  group.id === "overdue"
                                    ? isSurface
                                      ? "text-red-600"
                                      : "text-red-400"
                                    : isSurface
                                      ? "text-slate-600"
                                      : "text-cyan-200/70"
                                }`}
                              >
                                {getRelativeDay(task.data.deadline)}
                              </p>
                              <p
                                className={`text-[10px] ${
                                  isSurface
                                    ? "text-slate-400"
                                    : "text-cyan-300/40"
                                }`}
                              >
                                {formatDate(task.data.deadline)}
                              </p>
                            </>
                          ) : (
                            <input
                              type="date"
                              value=""
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                if (e.target.value) {
                                  onUpdateNode(task.id, {
                                    deadline: e.target.value,
                                  });
                                }
                              }}
                              className={`w-[100px] h-6 rounded-md border text-[10px] px-1.5 outline-none transition-colors ${
                                isSurface
                                  ? "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                                  : "border-cyan-500/20 bg-slate-800/50 text-cyan-300/30 hover:border-cyan-500/30"
                              }`}
                              title="Set deadline"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Completed section */}
            {completedTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      isSurface ? "text-emerald-600" : "text-emerald-400"
                    }`}
                  />
                  <h3
                    className={`text-sm font-semibold ${
                      isSurface ? "text-slate-700" : "text-cyan-100"
                    }`}
                  >
                    Completed ({completedTasks.length})
                  </h3>
                </div>

                <div
                  className={`rounded-xl border overflow-hidden ${
                    isSurface
                      ? "border-slate-200 bg-slate-50"
                      : "border-cyan-500/10 bg-slate-900/20"
                  }`}
                >
                  {completedTasks.slice(0, 5).map((task, idx) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 px-4 py-2 ${
                        idx > 0
                          ? isSurface
                            ? "border-t border-slate-100"
                            : "border-t border-cyan-500/5"
                          : ""
                      }`}
                    >
                      <button
                        onClick={() => onToggleTask(task.id, task.data.status)}
                        className={`flex-shrink-0 ${
                          isSurface ? "text-emerald-500" : "text-emerald-400"
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <p
                        className={`text-sm line-through ${
                          isSurface ? "text-slate-400" : "text-cyan-300/30"
                        }`}
                      >
                        {task.data.title || "Untitled task"}
                      </p>
                    </div>
                  ))}
                  {completedTasks.length > 5 && (
                    <p
                      className={`text-xs text-center py-2 ${
                        isSurface ? "text-slate-400" : "text-cyan-300/30"
                      }`}
                    >
                      +{completedTasks.length - 5} more completed
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
