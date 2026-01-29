"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Sparkles,
  Calendar,
  CalendarDays,
  CalendarRange,
  Target,
  Layers,
  Loader2,
  CheckCircle,
  Lightbulb,
} from "lucide-react";
import type { Idea, WorkshopPlan } from "@/app/lib/db/schema";

type TimelineType = "daily" | "weekly" | "monthly" | "quarterly" | "phases";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedIdeas: Idea[];
  projectId: string;
  onApplyPlan: (plan: WorkshopPlan) => void;
  theme?: "abyss" | "surface";
};

const TIMELINE_OPTIONS: {
  id: TimelineType;
  label: string;
  description: string;
  icon: typeof Calendar;
}[] = [
  {
    id: "daily",
    label: "Daily",
    description: "Micro-tasks for today/tomorrow",
    icon: Calendar,
  },
  {
    id: "weekly",
    label: "Weekly",
    description: "7-day sprint breakdown",
    icon: CalendarDays,
  },
  {
    id: "monthly",
    label: "Monthly",
    description: "4-week roadmap with milestones",
    icon: CalendarRange,
  },
  {
    id: "quarterly",
    label: "Quarterly",
    description: "3-month strategic plan",
    icon: Target,
  },
  {
    id: "phases",
    label: "Phases",
    description: "Full project lifecycle",
    icon: Layers,
  },
];

export function GrimpyWorkshop({
  open,
  onClose,
  selectedIdeas,
  projectId,
  onApplyPlan,
  theme = "abyss",
}: Props) {
  const [step, setStep] = useState<"timeline" | "context" | "generating" | "result">("timeline");
  const [timelineType, setTimelineType] = useState<TimelineType>("weekly");
  const [goalContext, setGoalContext] = useState("");
  const [constraints, setConstraints] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<WorkshopPlan | null>(null);

  const isSurface = theme === "surface";

  const handleGenerate = async () => {
    setStep("generating");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/grimpy/workshop-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideas: selectedIdeas.map((i) => ({
            id: i.id,
            content: i.content,
            imageUrl: i.imageUrl,
          })),
          timelineType,
          context: {
            goal: goalContext,
            constraints,
          },
          projectId,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || "Failed to generate plan");
      }

      setPlan(body as WorkshopPlan);
      setStep("result");
    } catch (e: any) {
      setError(e?.message || "Failed to generate plan");
      setStep("context");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (plan) {
      onApplyPlan(plan);
      onClose();
    }
  };

  const handleReset = () => {
    setStep("timeline");
    setPlan(null);
    setError("");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`w-full max-w-[720px] rounded-3xl border overflow-hidden ${
              isSurface
                ? "border-violet-200 bg-white shadow-2xl"
                : "border-violet-500/20 bg-slate-950/90 shadow-[0_0_40px_rgba(139,92,246,0.15)]"
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between border-b px-6 py-4 ${
                isSurface
                  ? "border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50"
                  : "border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-purple-500/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-2.5 ${
                    isSurface
                      ? "bg-violet-100"
                      : "bg-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  }`}
                >
                  <Sparkles
                    className={`h-5 w-5 ${isSurface ? "text-violet-600" : "text-violet-300"}`}
                  />
                </div>
                <div>
                  <h2
                    className={`text-lg font-semibold ${
                      isSurface ? "text-slate-800" : "text-violet-100"
                    }`}
                  >
                    Workshop with Grimpy
                  </h2>
                  <p
                    className={`text-xs ${
                      isSurface ? "text-slate-500" : "text-violet-300/60"
                    }`}
                  >
                    Transform {selectedIdeas.length} idea{selectedIdeas.length !== 1 ? "s" : ""} into
                    an actionable plan
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`rounded-full p-2 transition-colors ${
                  isSurface
                    ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    : "text-violet-200/50 hover:bg-violet-500/20 hover:text-violet-200"
                }`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Step 1: Timeline Selection */}
              {step === "timeline" && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <h3
                      className={`text-sm font-semibold ${
                        isSurface ? "text-slate-700" : "text-violet-100"
                      }`}
                    >
                      What planning horizon works best?
                    </h3>
                    <p
                      className={`text-xs mt-1 ${
                        isSurface ? "text-slate-500" : "text-violet-300/60"
                      }`}
                    >
                      Grimpy will structure your ideas into this timeline
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {TIMELINE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const isSelected = timelineType === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setTimelineType(option.id)}
                          className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                            isSelected
                              ? isSurface
                                ? "border-violet-400 bg-violet-50 shadow-md"
                                : "border-violet-400/50 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                              : isSurface
                                ? "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/50"
                                : "border-violet-500/10 bg-slate-900/50 hover:border-violet-500/30 hover:bg-violet-500/5"
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle
                                className={`h-4 w-4 ${
                                  isSurface ? "text-violet-500" : "text-violet-400"
                                }`}
                              />
                            </div>
                          )}
                          <Icon
                            className={`h-5 w-5 mb-2 ${
                              isSelected
                                ? isSurface
                                  ? "text-violet-600"
                                  : "text-violet-300"
                                : isSurface
                                  ? "text-slate-400"
                                  : "text-violet-400/50"
                            }`}
                          />
                          <span
                            className={`font-semibold text-sm ${
                              isSelected
                                ? isSurface
                                  ? "text-violet-700"
                                  : "text-violet-100"
                                : isSurface
                                  ? "text-slate-700"
                                  : "text-violet-200/80"
                            }`}
                          >
                            {option.label}
                          </span>
                          <span
                            className={`text-[11px] mt-0.5 ${
                              isSurface ? "text-slate-500" : "text-violet-300/50"
                            }`}
                          >
                            {option.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setStep("context")}
                      className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all ${
                        isSurface
                          ? "bg-violet-500 text-white hover:bg-violet-600"
                          : "bg-violet-500/20 text-violet-100 hover:bg-violet-500/30 border border-violet-500/30"
                      }`}
                    >
                      Next: Add Context
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Context */}
              {step === "context" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <h3
                      className={`text-sm font-semibold ${
                        isSurface ? "text-slate-700" : "text-violet-100"
                      }`}
                    >
                      Help Grimpy understand your goals
                    </h3>
                    <p
                      className={`text-xs mt-1 ${
                        isSurface ? "text-slate-500" : "text-violet-300/60"
                      }`}
                    >
                      Optional context to make the plan more relevant
                    </p>
                  </div>

                  {/* Selected Ideas Preview */}
                  <div
                    className={`rounded-xl border p-3 ${
                      isSurface
                        ? "border-slate-200 bg-slate-50"
                        : "border-violet-500/10 bg-slate-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb
                        className={`h-4 w-4 ${
                          isSurface ? "text-violet-500" : "text-violet-400"
                        }`}
                      />
                      <span
                        className={`text-xs font-semibold ${
                          isSurface ? "text-slate-600" : "text-violet-200"
                        }`}
                      >
                        Ideas to transform ({selectedIdeas.length})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedIdeas.slice(0, 5).map((idea) => (
                        <span
                          key={idea.id}
                          className={`rounded-lg px-2 py-1 text-[11px] truncate max-w-[150px] ${
                            isSurface
                              ? "bg-white border border-slate-200 text-slate-600"
                              : "bg-violet-500/10 border border-violet-500/20 text-violet-200"
                          }`}
                        >
                          {idea.content.slice(0, 30)}...
                        </span>
                      ))}
                      {selectedIdeas.length > 5 && (
                        <span
                          className={`rounded-lg px-2 py-1 text-[11px] ${
                            isSurface ? "text-slate-400" : "text-violet-300/50"
                          }`}
                        >
                          +{selectedIdeas.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label
                        className={`block text-xs font-semibold mb-1.5 ${
                          isSurface ? "text-slate-600" : "text-violet-200/80"
                        }`}
                      >
                        What's the main goal? (optional)
                      </label>
                      <textarea
                        value={goalContext}
                        onChange={(e) => setGoalContext(e.target.value)}
                        placeholder="e.g., Launch the MVP by end of month..."
                        rows={2}
                        className={`w-full rounded-xl border p-3 text-sm outline-none transition-colors ${
                          isSurface
                            ? "border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:border-violet-400"
                            : "border-violet-500/20 bg-slate-900/50 text-violet-50 placeholder:text-violet-300/30 focus:border-violet-400/50"
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-xs font-semibold mb-1.5 ${
                          isSurface ? "text-slate-600" : "text-violet-200/80"
                        }`}
                      >
                        Any constraints? (optional)
                      </label>
                      <textarea
                        value={constraints}
                        onChange={(e) => setConstraints(e.target.value)}
                        placeholder="e.g., Limited budget, solo developer, deadline in 2 weeks..."
                        rows={2}
                        className={`w-full rounded-xl border p-3 text-sm outline-none transition-colors ${
                          isSurface
                            ? "border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:border-violet-400"
                            : "border-violet-500/20 bg-slate-900/50 text-violet-50 placeholder:text-violet-300/30 focus:border-violet-400/50"
                        }`}
                      />
                    </div>
                  </div>

                  {error && (
                    <div
                      className={`rounded-xl p-3 text-sm ${
                        isSurface
                          ? "bg-rose-50 text-rose-600 border border-rose-200"
                          : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                      }`}
                    >
                      {error}
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={() => setStep("timeline")}
                      className={`rounded-xl px-4 py-2 text-sm transition-colors ${
                        isSurface
                          ? "text-slate-500 hover:bg-slate-100"
                          : "text-violet-300/60 hover:bg-violet-500/10"
                      }`}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleGenerate}
                      className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 ${
                        isSurface
                          ? "bg-violet-500 text-white hover:bg-violet-600"
                          : "bg-violet-500/20 text-violet-100 hover:bg-violet-500/30 border border-violet-500/30"
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate Plan
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Generating */}
              {step === "generating" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <div
                    className={`rounded-full p-6 mb-4 ${
                      isSurface
                        ? "bg-violet-100"
                        : "bg-violet-500/10 shadow-[0_0_30px_rgba(139,92,246,0.2)]"
                    }`}
                  >
                    <Loader2
                      className={`h-8 w-8 animate-spin ${
                        isSurface ? "text-violet-500" : "text-violet-400"
                      }`}
                    />
                  </div>
                  <h3
                    className={`text-lg font-semibold ${
                      isSurface ? "text-slate-700" : "text-violet-100"
                    }`}
                  >
                    Grimpy is thinking...
                  </h3>
                  <p
                    className={`text-sm mt-1 ${
                      isSurface ? "text-slate-500" : "text-violet-300/60"
                    }`}
                  >
                    Analyzing your ideas and crafting a plan
                  </p>
                </motion.div>
              )}

              {/* Step 4: Result */}
              {step === "result" && plan && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle
                      className={`h-5 w-5 ${
                        isSurface ? "text-emerald-500" : "text-emerald-400"
                      }`}
                    />
                    <h3
                      className={`text-sm font-semibold ${
                        isSurface ? "text-slate-700" : "text-violet-100"
                      }`}
                    >
                      Plan Generated!
                    </h3>
                  </div>

                  {/* Plan Summary */}
                  <div
                    className={`rounded-xl border p-4 space-y-3 ${
                      isSurface
                        ? "border-slate-200 bg-slate-50"
                        : "border-violet-500/10 bg-slate-900/50"
                    }`}
                  >
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isSurface ? "text-slate-400" : "text-violet-300/50"
                        }`}
                      >
                        Strategy
                      </span>
                      <h4
                        className={`font-semibold ${
                          isSurface ? "text-slate-800" : "text-violet-100"
                        }`}
                      >
                        {plan.strategy.title}
                      </h4>
                      <p
                        className={`text-sm mt-1 ${
                          isSurface ? "text-slate-600" : "text-violet-200/80"
                        }`}
                      >
                        {plan.strategy.description}
                      </p>
                    </div>

                    {plan.milestones && plan.milestones.length > 0 && (
                      <div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isSurface ? "text-slate-400" : "text-violet-300/50"
                          }`}
                        >
                          Milestones ({plan.milestones.length})
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {plan.milestones.map((m, i) => (
                            <span
                              key={i}
                              className={`rounded-lg px-2 py-1 text-xs ${
                                isSurface
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                              }`}
                            >
                              {m.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isSurface ? "text-slate-400" : "text-violet-300/50"
                        }`}
                      >
                        Tasks ({plan.tactics.length})
                      </span>
                      <div className="mt-1 space-y-1 max-h-[150px] overflow-y-auto">
                        {plan.tactics.map((t, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-2 text-sm ${
                              isSurface ? "text-slate-600" : "text-violet-200/80"
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isSurface
                                  ? "bg-cyan-100 text-cyan-600"
                                  : "bg-cyan-500/20 text-cyan-300"
                              }`}
                            >
                              {i + 1}
                            </span>
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div
                    className={`rounded-xl p-3 text-sm ${
                      isSurface
                        ? "bg-violet-50 text-violet-700 border border-violet-200"
                        : "bg-violet-500/10 text-violet-200 border border-violet-500/20"
                    }`}
                  >
                    {plan.summary}
                  </div>

                  <div className="flex justify-between pt-2">
                    <button
                      onClick={handleReset}
                      className={`rounded-xl px-4 py-2 text-sm transition-colors ${
                        isSurface
                          ? "text-slate-500 hover:bg-slate-100"
                          : "text-violet-300/60 hover:bg-violet-500/10"
                      }`}
                    >
                      Start Over
                    </button>
                    <button
                      onClick={handleApply}
                      className={`rounded-xl px-6 py-2.5 text-sm font-semibold transition-all flex items-center gap-2 ${
                        isSurface
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 border border-emerald-500/30"
                      }`}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Apply to Canvas
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
