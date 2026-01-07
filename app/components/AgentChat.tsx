"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, MessageCircle, ChevronUp, ChevronDown, Sparkles, Clock, AlertTriangle, Calendar, Search } from "lucide-react";
import { Mascot, MascotVariant } from "./Mascot";
import { AiProviderSelector } from "./ui/AiProviderSelector";
import type { AgentType, Provider } from "@/app/lib/ai/aiConstants";
import { DEFAULT_MODELS } from "@/app/lib/ai/aiConstants";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AgentChatProps = {
  initialAgent?: MascotVariant;
  onHighlightNodes?: (nodeIds: string[], color: string, duration?: number) => void;
  theme?: "abyss" | "surface";
};

export function AgentChat({ initialAgent = "dumbo", onHighlightNodes, theme = "abyss" }: AgentChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isSurface = theme === "surface";
  const [agent, setAgent] = useState<MascotVariant>(initialAgent);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Provider>("google");
  const [currentModel, setCurrentModel] = useState<string>(DEFAULT_MODELS.google);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const stopEvent = (e: Event) => e.stopPropagation();
    el.addEventListener("keydown", stopEvent, true);
    el.addEventListener("keyup", stopEvent, true);
    el.addEventListener("mousedown", stopEvent, true);
    return () => {
      el.removeEventListener("keydown", stopEvent, true);
      el.removeEventListener("keyup", stopEvent, true);
      el.removeEventListener("mousedown", stopEvent, true);
    };
  }, []);

  // Fetch user preferences on mount and when agent changes
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          const agentType = agent === "dumbo" ? "dumbo" : agent === "dumby" ? "dumby" : "dumbo";
          const pref = data[agentType];
          if (pref) {
            setCurrentProvider(pref.provider);
            setCurrentModel(pref.model);
          } else {
            // Use defaults based on agent
            if (agentType === "dumbo") {
              setCurrentProvider("google");
              setCurrentModel(DEFAULT_MODELS.google);
            } else {
              setCurrentProvider("openai");
              setCurrentModel(DEFAULT_MODELS.openai);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch preferences:", err);
      }
    };
    fetchPreferences();
  }, [agent]);

  const handleSavePreferences = async (provider: Provider, model: string) => {
    const agentType = agent === "dumbo" ? "dumbo" : agent === "dumby" ? "dumby" : "dumbo";
    const response = await fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentType, provider, model }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to save preferences");
    }
    setCurrentProvider(provider);
    setCurrentModel(model);
    // Show warning if API key is missing (but preference was saved)
    if (data.warning) {
      setError(data.warning);
      setTimeout(() => setError(null), 5000); // Clear warning after 5 seconds
    }
  };

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      // Add user message
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent,
            userDateTime: new Date().toISOString(), // Pass local time to handle timezones
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Add assistant message
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: data.text || "I'm here to help! 🐙",
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Trigger node highlighting if provided
        if (data.highlightNodes && onHighlightNodes) {
          const { nodeIds, color, results } = data.highlightNodes;
          
          // Map colors based on urgency
          let finalColor = color;
          if (color === "multi" && results) {
            // For "scan all", we'll highlight overdue in red, today in yellow, upcoming in blue
            // But for simplicity, let's use cyan to indicate "mixed urgency"
            finalColor = "cyan";
          }
          
          onHighlightNodes(nodeIds, finalColor, 10000); // 10 seconds
        }
      } catch (err: any) {
        console.error("Chat error:", err);
        setError(err.message || "Failed to send message");
      } finally {
        setIsLoading(false);
      }
    },
    [agent, messages, onHighlightNodes],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent, commandText?: string) => {
      e.preventDefault();
      const text = commandText || input.trim();
      if (text) {
        sendMessage(text);
      }
    },
    [input, sendMessage],
  );

  const quickCommands = [
    { label: "Scan Deadlines", icon: Search, text: "scan deadlines" },
    { label: "Overdue", icon: AlertTriangle, text: "What's overdue?" },
    { label: "Today", icon: Calendar, text: "What's due today?" },
    { label: "Tomorrow", icon: Calendar, text: "What's due tomorrow?" },
    { label: "Urgent", icon: Clock, text: "Show me urgent tasks" },
  ];

  const agentColors = {
    dumbo: isSurface 
      ? "border-slate-200 bg-white text-slate-900 shadow-xl"
      : "border-yellow-500/40 bg-slate-950 text-white shadow-[0_0_30px_rgba(234,179,8,0.3)]",
    dumby: isSurface
      ? "border-slate-200 bg-white text-slate-900 shadow-xl"
      : "border-orange-500/40 bg-slate-950 text-white shadow-[0_0_30px_rgba(249,115,22,0.3)]",
    grimpy: isSurface
      ? "border-slate-200 bg-white text-slate-900 shadow-xl"
      : "border-cyan-500/40 bg-slate-950 text-white shadow-[0_0_30px_rgba(6,182,212,0.3)]",
  };

  const agentHeaderColors = {
    dumbo: isSurface ? "from-yellow-50 to-white" : "from-yellow-900/60 to-slate-950",
    dumby: isSurface ? "from-orange-50 to-white" : "from-orange-900/60 to-slate-950",
    grimpy: isSurface ? "from-cyan-50 to-white" : "from-cyan-900/60 to-slate-950",
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-[84px] right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-md transition-all hover:scale-110 ${
          isSurface
            ? "border-slate-300 bg-white text-slate-700 shadow-lg hover:bg-slate-50"
            : "border-cyan-400/30 bg-slate-950/80 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:border-cyan-400/50"
        }`}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    );
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      className={`fixed bottom-6 right-6 z-[100] flex flex-col overflow-hidden rounded-3xl border transition-all duration-300 nopan nowheel nodrag ${
        agentColors[agent]
      } ${isMinimized ? "h-14 w-64" : "h-[600px] w-80 md:w-96"}`}
    >
      <div 
        className={`flex items-center justify-between bg-gradient-to-r px-4 py-3 cursor-grab active:cursor-grabbing ${agentHeaderColors[agent]}`}
      >
        <div className="flex items-center gap-3">
          <Mascot variant={agent} size={28} theme={theme} />
          <div className="flex flex-col">
            <span className={`text-xs font-bold uppercase tracking-widest ${isSurface ? 'text-slate-500' : 'text-white/80'}`}>
              {agent === "dumbo" ? "Intern" : agent === "dumby" ? "Manager" : "Architect"}
            </span>
            <span className={`text-sm font-semibold capitalize ${isSurface ? 'text-slate-900' : 'text-white'}`}>{agent}</span>
            {(agent === "dumbo" || agent === "dumby") && (
              <span className={`text-[10px] mt-0.5 ${isSurface ? 'text-slate-400' : 'text-white/50'}`}>
                {currentProvider === "openai" ? "OpenAI" : currentProvider === "google" ? "Gemini" : "Claude"} • {currentModel.replace(/-/g, " ")}
              </span>
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1 ${isSurface ? 'text-slate-400' : 'text-white'}`}>
          {(agent === "dumbo" || agent === "dumby") && (
            <AiProviderSelector
              agentType={agent as AgentType}
              currentProvider={currentProvider}
              currentModel={currentModel}
              onSave={handleSavePreferences}
            />
          )}
          <button onClick={() => setIsMinimized(!isMinimized)} className="rounded-full p-1.5 hover:bg-black/5">
            {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="rounded-full p-1.5 hover:bg-black/5">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className={`flex gap-2 border-b p-2 ${isSurface ? 'border-slate-100 bg-slate-50/50' : 'border-white/5 bg-slate-950/40'}`}>
            {(["dumbo", "dumby", "grimpy"] as MascotVariant[]).map((v) => (
              <button
                key={v}
                onClick={() => setAgent(v)}
                onPointerDown={(e) => e.stopPropagation()}
                className={`flex-1 rounded-xl py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                  agent === v 
                    ? isSurface ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "bg-white/10 text-white" 
                    : isSurface ? "text-slate-400 hover:text-slate-600 hover:bg-white/50" : "text-white/40 hover:bg-white/5 hover:text-white/60"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <div 
            ref={scrollRef} 
            className={`flex-1 overflow-y-auto p-4 space-y-4 ${isSurface ? 'bg-slate-50/30' : 'bg-black/40'}`}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {messages.length === 0 && (
              <div className={`flex h-full flex-col items-center justify-center text-center ${isSurface ? 'text-slate-900' : 'text-white'}`}>
                <Sparkles className={`mb-3 h-10 w-10 ${isSurface ? 'text-cyan-600' : 'text-cyan-400'}`} />
                <p className="text-base font-bold tracking-wide">How can {agent} help you today?</p>
                <p className={`mt-2 text-xs ${isSurface ? 'text-slate-500' : 'text-white/60'}`}>Ask about deadlines to see them glow on your canvas!</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? isSurface 
                        ? "bg-slate-800 text-white" 
                        : "bg-cyan-600 text-white border-2 border-cyan-400/50"
                      : isSurface
                        ? "bg-white text-slate-900 border border-slate-200"
                        : "bg-slate-800 text-white border-2 border-slate-600"
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className={`mb-2 last:mb-0 ${isSurface && m.role !== 'user' ? 'text-slate-800' : 'text-white'}`}>{children}</p>,
                      ul: ({ children }) => <ul className={`mb-2 ml-4 list-disc space-y-1 ${isSurface && m.role !== 'user' ? 'text-slate-800' : 'text-white'}`}>{children}</ul>,
                      ol: ({ children }) => <ol className={`mb-2 ml-4 list-decimal space-y-1 ${isSurface && m.role !== 'user' ? 'text-slate-800' : 'text-white'}`}>{children}</ol>,
                      li: ({ children }) => <li className={`pl-1 ${isSurface && m.role !== 'user' ? 'text-slate-800' : 'text-white'}`}>{children}</li>,
                      strong: ({ children }) => <strong className={`font-bold ${isSurface ? 'text-yellow-700' : 'text-yellow-300'}`}>{children}</strong>,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={`flex items-center gap-2 text-sm px-2 ${isSurface ? 'text-slate-600' : 'text-white/80'}`}>
                <div className="flex gap-1">
                  <div className={`h-2 w-2 animate-bounce rounded-full ${isSurface ? 'bg-slate-400' : 'bg-cyan-400'}`} />
                  <div className={`h-2 w-2 animate-bounce rounded-full ${isSurface ? 'bg-slate-400' : 'bg-cyan-400'} [animation-delay:0.2s]`} />
                  <div className={`h-2 w-2 animate-bounce rounded-full ${isSurface ? 'bg-slate-400' : 'bg-cyan-400'} [animation-delay:0.4s]`} />
                </div>
                <span className="font-medium">{agent} is thinking...</span>
              </div>
            )}
            {error && (
              <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 text-sm text-red-700 font-semibold">
                ⚠️ {error}
              </div>
            )}
          </div>

          {agent === "dumbo" && (
            <div 
              className={`flex flex-wrap gap-2 px-4 py-3 border-t ${isSurface ? 'bg-white border-slate-100' : 'bg-slate-900/80 border-white/10'}`}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {quickCommands.map((cmd) => (
                <button
                  key={cmd.label}
                  onClick={(e) => handleSubmit(e, cmd.text)}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                    isSurface
                      ? "border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                      : "border-yellow-500/40 bg-yellow-600/20 text-yellow-200 hover:bg-yellow-600/30"
                  }`}
                >
                  <cmd.icon className="h-3 w-3" />
                  {cmd.label}
                </button>
              ))}
            </div>
          )}

          <form 
            onSubmit={(e) => handleSubmit(e)} 
            className={`border-t p-4 ${isSurface ? 'bg-white border-slate-100' : 'bg-slate-900 border-white/10'}`}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Talk to ${agent}...`}
                className={`flex-1 rounded-xl border-2 px-4 py-2.5 text-base outline-none transition-all focus:border-cyan-400 ${
                  isSurface
                    ? "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white"
                    : "border-white/20 bg-black/60 text-white placeholder:text-slate-400 focus:bg-black/80"
                }`}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all disabled:opacity-50 shadow-lg ${
                  agent === "dumbo" ? "bg-yellow-600 hover:bg-yellow-500" :
                  agent === "dumby" ? "bg-orange-600 hover:bg-orange-500" :
                  "bg-cyan-600 hover:bg-cyan-500"
                }`}
              >
                <Send className="h-5 w-5 text-white" />
              </button>
            </div>
          </form>
        </>
      )}
    </motion.div>
  );
}
