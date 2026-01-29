"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Send,
  Loader2,
  Sparkles,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Wand2,
} from "lucide-react";
import type { Idea, WorkshopPlan } from "@/app/lib/db/schema";
import { Mascot } from "../Mascot";

type Props = {
  ideas: Idea[];
  projectId: string;
  onPlanGenerated: (plan: WorkshopPlan) => void;
  onClose: () => void;
  theme?: "abyss" | "surface";
};

type TimelineType = "daily" | "weekly" | "monthly" | "quarterly" | "phases";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type PlanPreviewProps = {
  plan: WorkshopPlan;
  onApply: () => void;
  theme?: "abyss" | "surface";
};

function PlanPreview({ plan, onApply, theme = "abyss" }: PlanPreviewProps) {
  const [expanded, setExpanded] = useState(true);
  const isSurface = theme === "surface";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border overflow-hidden ${
        isSurface
          ? "border-violet-200 bg-violet-50"
          : "border-violet-500/30 bg-violet-500/10"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between p-4 transition-colors ${
          isSurface ? "hover:bg-violet-100" : "hover:bg-violet-500/20"
        }`}
      >
        <div className="flex items-center gap-2">
          <Sparkles
            className={`h-4 w-4 ${isSurface ? "text-violet-600" : "text-violet-400"}`}
          />
          <span
            className={`font-semibold text-sm ${
              isSurface ? "text-violet-800" : "text-violet-200"
            }`}
          >
            {plan.strategy.title}
          </span>
        </div>
        {expanded ? (
          <ChevronUp
            className={`h-4 w-4 ${isSurface ? "text-violet-500" : "text-violet-400"}`}
          />
        ) : (
          <ChevronDown
            className={`h-4 w-4 ${isSurface ? "text-violet-500" : "text-violet-400"}`}
          />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 space-y-3 border-t ${
              isSurface ? "border-violet-200" : "border-violet-500/20"
            }`}>
              <p
                className={`text-sm pt-3 ${
                  isSurface ? "text-violet-700" : "text-violet-200/80"
                }`}
              >
                {plan.strategy.description}
              </p>

              {plan.milestones && plan.milestones.length > 0 && (
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isSurface ? "text-violet-500" : "text-violet-400/60"
                    }`}
                  >
                    Milestones
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {plan.milestones.map((m, i) => (
                      <span
                        key={i}
                        className={`rounded-lg px-2 py-0.5 text-[11px] ${
                          isSurface
                            ? "bg-amber-100 text-amber-700"
                            : "bg-amber-500/20 text-amber-300"
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
                    isSurface ? "text-violet-500" : "text-violet-400/60"
                  }`}
                >
                  Tasks ({plan.tactics.length})
                </span>
                <div className="mt-1 space-y-1 max-h-[120px] overflow-y-auto">
                  {plan.tactics.slice(0, 8).map((t, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-xs ${
                        isSurface ? "text-violet-700" : "text-violet-200/80"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          isSurface
                            ? "bg-cyan-100 text-cyan-600"
                            : "bg-cyan-500/20 text-cyan-300"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                  {plan.tactics.length > 8 && (
                    <span
                      className={`text-[10px] ${
                        isSurface ? "text-violet-500" : "text-violet-400/50"
                      }`}
                    >
                      +{plan.tactics.length - 8} more tasks
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={onApply}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
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
      </AnimatePresence>
    </motion.div>
  );
}

export function GrimpyWorkshopChat({
  ideas,
  projectId,
  onPlanGenerated,
  onClose,
  theme = "abyss",
}: Props) {
  const isSurface = theme === "surface";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<WorkshopPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineType>("weekly");
  const [streamingContent, setStreamingContent] = useState("");

  // Send initial message when component mounts
  useEffect(() => {
    if (ideas.length > 0 && messages.length === 0) {
      const initialContent = `I have ${ideas.length} idea${ideas.length !== 1 ? "s" : ""} I'd like to work on:\n\n${ideas.map((idea, i) => `${i + 1}. ${idea.content}`).join("\n")}\n\nHelp me turn these into a plan.`;
      sendMessage(initialContent);
    }
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, generatedPlan]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Send message and stream response
  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/grimpy/workshop-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          ideas: ideas.map((i) => ({ id: i.id, content: i.content, imageUrl: i.imageUrl })),
          projectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE format
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            // Text content
            try {
              const text = JSON.parse(line.slice(2));
              fullContent += text;
              setStreamingContent(fullContent);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Add assistant message
      if (fullContent) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullContent,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `The depths stirred with an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingContent("");
    }
  }, [messages, ideas, projectId]);

  // Extract context from conversation for plan generation
  const extractContextFromConversation = useCallback(() => {
    const userMessages = messages.filter((m) => m.role === "user");
    return userMessages.map((m) => m.content).join("\n");
  }, [messages]);

  // Generate plan using the workshop-plan endpoint
  const handleGeneratePlan = useCallback(async () => {
    setIsGenerating(true);

    try {
      const conversationContext = extractContextFromConversation();

      const res = await fetch("/api/grimpy/workshop-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideas: ideas.map((i) => ({
            id: i.id,
            content: i.content,
            imageUrl: i.imageUrl,
          })),
          timelineType: selectedTimeline,
          context: {
            goal: conversationContext,
            constraints: "",
          },
          projectId,
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error || "Failed to generate plan");
      }

      setGeneratedPlan(body as WorkshopPlan);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to generate plan";
      console.error("Plan generation error:", message);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `The depths stirred with an error: ${message}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsGenerating(false);
    }
  }, [ideas, selectedTimeline, projectId, extractContextFromConversation]);

  const handleApplyPlan = () => {
    if (generatedPlan) {
      onPlanGenerated(generatedPlan);
      onClose();
    }
  };

  const handleSubmit = useCallback((e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setGeneratedPlan(null);
    setStreamingContent("");
    // Resend initial message
    if (ideas.length > 0) {
      setTimeout(() => {
        const initialContent = `I have ${ideas.length} idea${ideas.length !== 1 ? "s" : ""} I'd like to work on:\n\n${ideas.map((idea, i) => `${i + 1}. ${idea.content}`).join("\n")}\n\nHelp me turn these into a plan.`;
        sendMessage(initialContent);
      }, 100);
    }
  };

  const handleQuickPrompt = useCallback((prompt: string) => {
    if (!isLoading) {
      sendMessage(prompt);
    }
  }, [isLoading, sendMessage]);

  const timelineOptions: { id: TimelineType; label: string }[] = [
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "phases", label: "Phases" },
  ];

  return (
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
        className={`w-full max-w-[600px] h-[80vh] max-h-[700px] rounded-3xl border flex flex-col overflow-hidden ${
          isSurface
            ? "border-violet-200 bg-white shadow-2xl"
            : "border-violet-500/20 bg-slate-950/95 shadow-[0_0_40px_rgba(139,92,246,0.15)]"
        }`}
      >
        {/* Header */}
        <div
          className={`flex-shrink-0 flex items-center justify-between border-b px-5 py-4 ${
            isSurface
              ? "border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50"
              : "border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-purple-500/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <Mascot variant="grimpy" size={36} theme={theme} />
            <div>
              <h2
                className={`text-base font-semibold ${
                  isSurface ? "text-slate-800" : "text-violet-100"
                }`}
              >
                Workshop with Grimpy
              </h2>
              <p
                className={`text-[10px] uppercase tracking-wider ${
                  isSurface ? "text-slate-500" : "text-violet-300/60"
                }`}
              >
                {ideas.length} idea{ideas.length !== 1 ? "s" : ""} in workshop
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className={`rounded-full p-2 transition-colors ${
                isSurface
                  ? "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  : "text-violet-200/50 hover:bg-violet-500/20 hover:text-violet-200"
              }`}
              title="Start over"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
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
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? isSurface
                      ? "bg-violet-500 text-white"
                      : "bg-violet-500/30 text-violet-100"
                    : isSurface
                      ? "bg-slate-100 text-slate-700"
                      : "bg-slate-800/80 text-slate-200"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles
                      className={`h-3 w-3 ${
                        isSurface ? "text-violet-500" : "text-violet-400"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSurface ? "text-violet-500" : "text-violet-400"
                      }`}
                    >
                      Grimpy
                    </span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Streaming content */}
          {streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  isSurface ? "bg-slate-100 text-slate-700" : "bg-slate-800/80 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles
                    className={`h-3 w-3 ${isSurface ? "text-violet-500" : "text-violet-400"}`}
                  />
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isSurface ? "text-violet-500" : "text-violet-400"
                    }`}
                  >
                    Grimpy
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {streamingContent}
                </p>
              </div>
            </motion.div>
          )}

          {/* Loading indicator */}
          {isLoading && !streamingContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div
                className={`rounded-2xl px-4 py-3 ${
                  isSurface ? "bg-slate-100" : "bg-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Loader2
                    className={`h-4 w-4 animate-spin ${
                      isSurface ? "text-violet-500" : "text-violet-400"
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      isSurface ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Grimpy is thinking...
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Generated Plan Preview */}
          {generatedPlan && (
            <PlanPreview
              plan={generatedPlan}
              onApply={handleApplyPlan}
              theme={theme}
            />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Timeline selector and Generate Plan button */}
        {!generatedPlan && messages.length >= 2 && (
          <div
            className={`flex-shrink-0 border-t px-4 py-3 ${
              isSurface ? "border-slate-200 bg-violet-50/50" : "border-violet-500/20 bg-violet-500/5"
            }`}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isSurface ? "text-slate-500" : "text-violet-300/60"
                }`}
              >
                Timeline:
              </span>
              <div className="flex gap-1 flex-wrap">
                {timelineOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedTimeline(opt.id)}
                    className={`rounded-lg px-2 py-1 text-[11px] transition-colors ${
                      selectedTimeline === opt.id
                        ? isSurface
                          ? "bg-violet-500 text-white"
                          : "bg-violet-500/30 text-violet-100"
                        : isSurface
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-slate-800/50 text-violet-300/60 hover:bg-violet-500/10"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleGeneratePlan}
                disabled={isGenerating || isLoading}
                className={`ml-auto flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  isSurface
                    ? "bg-violet-500 text-white hover:bg-violet-600 disabled:bg-slate-200 disabled:text-slate-400"
                    : "bg-violet-500/20 text-violet-100 hover:bg-violet-500/30 border border-violet-500/30 disabled:opacity-50"
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Forging...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate Plan
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div
          className={`flex-shrink-0 border-t p-4 ${
            isSurface ? "border-slate-200 bg-white" : "border-violet-500/20 bg-slate-900/50"
          }`}
        >
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Chat with Grimpy about your plan..."
                rows={1}
                className={`w-full resize-none rounded-xl border px-4 py-3 pr-12 text-sm outline-none transition-colors ${
                  isSurface
                    ? "border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:border-violet-400"
                    : "border-violet-500/20 bg-slate-800/50 text-violet-50 placeholder:text-violet-300/30 focus:border-violet-400/50"
                }`}
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`flex-shrink-0 rounded-xl p-3 transition-all ${
                isSurface
                  ? "bg-violet-500 text-white hover:bg-violet-600 disabled:bg-slate-200 disabled:text-slate-400"
                  : "bg-violet-500/20 text-violet-100 hover:bg-violet-500/30 disabled:bg-slate-800 disabled:text-slate-500 border border-violet-500/30"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>

          {/* Quick prompts */}
          {messages.length <= 2 && !isLoading && (
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                "What timeline do you recommend?",
                "I need this done in 2 weeks",
                "Let's start planning",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] transition-colors ${
                    isSurface
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/20"
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
