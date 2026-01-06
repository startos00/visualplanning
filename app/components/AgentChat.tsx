"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat, Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, X, MessageCircle, ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { Mascot, MascotVariant } from "./Mascot";

type AgentChatProps = {
  initialAgent?: MascotVariant;
};

export function AgentChat({ initialAgent = "dumbo" }: AgentChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [agent, setAgent] = useState<MascotVariant>(initialAgent);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the latest agent value available to the transport body function.
  const agentRef = useRef<MascotVariant>(agent);
  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  // Use the same AI SDK transport pattern as DumbyInterrogationReader.
  const [chat] = useState(() => {
    const transport = new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ agent: agentRef.current }),
    });
    return new Chat({ transport });
  });

  const chatHelpers = useChat({ chat });
  const { messages, sendMessage, status, error } = chatHelpers as any;
  const isLoading = status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Aggressively stop propagation for keyboard events to prevent React Flow from stealing focus/keystrokes
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const stopEvent = (e: KeyboardEvent | MouseEvent) => {
      e.stopPropagation();
    };

    // Use capture: true to catch events before they bubble up to React Flow's global listeners
    el.addEventListener("keydown", stopEvent as any, true);
    el.addEventListener("keyup", stopEvent as any, true);
    el.addEventListener("keypress", stopEvent as any, true);
    el.addEventListener("mousedown", stopEvent as any, true);
    el.addEventListener("pointerdown", stopEvent as any, true);

    return () => {
      el.removeEventListener("keydown", stopEvent as any, true);
      el.removeEventListener("keyup", stopEvent as any, true);
      el.removeEventListener("keypress", stopEvent as any, true);
      el.removeEventListener("mousedown", stopEvent as any, true);
      el.removeEventListener("pointerdown", stopEvent as any, true);
    };
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text) return;
      try {
        await sendMessage({
          role: "user",
          parts: [{ type: "text", text }],
        } as any);
        setInput("");
      } catch {
        // errors are surfaced via `error` from the hook
      }
    },
    [input, sendMessage],
  );

  const agentColors = {
    dumbo: "border-yellow-500/30 bg-yellow-500/10 text-yellow-100 shadow-[0_0_15px_rgba(234,179,8,0.2)]",
    dumby: "border-orange-500/30 bg-orange-500/10 text-orange-100 shadow-[0_0_15px_rgba(249,115,22,0.2)]",
    grimpy: "border-cyan-500/30 bg-cyan-500/10 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.2)]",
  };

  const agentHeaderColors = {
    dumbo: "from-yellow-900/40 to-slate-900",
    dumby: "from-orange-900/40 to-slate-900",
    grimpy: "from-cyan-900/40 to-slate-900",
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[84px] right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full border border-cyan-400/30 bg-slate-950/80 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] backdrop-blur-md transition-all hover:scale-110 hover:border-cyan-400/50"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] flex flex-col overflow-hidden rounded-3xl border transition-all duration-300 nopan nowheel nodrag ${
        agentColors[agent]
      } ${isMinimized ? "h-14 w-64" : "h-[500px] w-80 md:w-96"}`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between bg-gradient-to-r px-4 py-3 ${agentHeaderColors[agent]}`}
      >
        <div className="flex items-center gap-3">
          <Mascot variant={agent} size={28} />
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-widest opacity-80">
              {agent === "dumbo" ? "Intern" : agent === "dumby" ? "Manager" : "Architect"}
            </span>
            <span className="text-sm font-semibold capitalize">{agent}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="rounded-full p-1.5 hover:bg-white/10"
          >
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1.5 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Agent Picker */}
          <div className="flex gap-2 border-b border-white/5 bg-slate-950/40 p-2">
            {(["dumbo", "dumby", "grimpy"] as MascotVariant[]).map((v) => (
              <button
                key={v}
                onClick={() => setAgent(v)}
                className={`flex-1 rounded-xl py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  agent === v
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:bg-white/5 hover:text-white/60"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-slate-950/20 p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
          >
            {(messages || []).length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center opacity-40">
                <Sparkles className="mb-2 h-8 w-8" />
                <p className="text-sm">How can {agent} help you today?</p>
              </div>
            )}
            {(messages || []).map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-cyan-500/20 text-cyan-50 border border-cyan-500/20"
                      : "bg-slate-800/60 text-white border border-white/5"
                  }`}
                >
                  {m.content}
                  {/* Handle tool calls if any (simplified) */}
                  {m.toolInvocations?.map((toolInvocation) => {
                    const { toolName, toolCallId, state } = toolInvocation;

                    if (state === 'result') {
                      const { result } = toolInvocation;
                      return (
                        <div key={toolCallId} className="mt-2 rounded-lg bg-black/20 p-2 text-[10px] font-mono opacity-80">
                          <div className="font-bold text-cyan-400 uppercase">{toolName} result:</div>
                          <div className="truncate">{JSON.stringify(result)}</div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={toolCallId} className="mt-2 flex items-center gap-2 text-[10px] opacity-60">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                          Running {toolName}...
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-xs opacity-50">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:0.2s]" />
                  <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:0.4s]" />
                </div>
                <span>{agent} is thinking...</span>
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-200">
                Error: {error.message || "Failed to connect to Abyss."}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={onSubmit} className="border-t border-white/10 p-4 bg-slate-950/40">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input || ""}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Talk to ${agent}...`}
                className="flex-1 rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/20 outline-none focus:border-cyan-500/30 focus:bg-white/10"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !(input || "").trim()}
                className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all disabled:opacity-50 ${
                  agent === "dumbo" ? "bg-yellow-600 hover:bg-yellow-500" :
                  agent === "dumby" ? "bg-orange-600 hover:bg-orange-500" :
                  "bg-cyan-600 hover:bg-cyan-500"
                }`}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

