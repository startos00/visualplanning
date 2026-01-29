"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, AlertTriangle, Calendar, Clock, Sparkles, 
  Book, FileText, Youtube, Highlighter, ListChecks,
  LayoutTemplate, Link as LinkIcon, Lightbulb, 
  Network, MessageSquareQuote, Shuffle, Music
} from "lucide-react";
import { Mascot, MascotVariant } from "./Mascot";

type MascotAgentPanelProps = {
  theme?: "abyss" | "surface";
  onAppend: (message: { role: "user"; content: string }) => void;
  onOpenResourceChamber: () => void;
  onOpenThoughtPool?: () => void;
  dragConstraints?: React.RefObject<HTMLDivElement | null>;
  activeMascot: MascotVariant | null;
  onActiveMascotChange: (agent: MascotVariant | null) => void;
};

type Tool = {
  id: string;
  icon: any;
  label: string;
};

export function MascotAgentPanel({
  theme = "abyss",
  onAppend,
  onOpenResourceChamber,
  onOpenThoughtPool,
  dragConstraints,
  activeMascot,
  onActiveMascotChange
}: MascotAgentPanelProps) {
  const isSurface = theme === "surface";

  const handleToolClick = (toolId: string, agent: MascotVariant) => {
    switch (toolId) {
      // Dumbo Tools
      case "checkDeadlines":
        onAppend({ role: "user", content: "Scan all nodes for deadlines." });
        break;
      case "groupTasks":
        onAppend({ role: "user", content: "Group scattered task nodes into a cluster." });
        break;
      case "setReminder":
        onAppend({ role: "user", content: "Set a reminder for the selected task." });
        break;
      case "prioritizeTasks":
        onAppend({ role: "user", content: "Prioritize my tasks using RAG markers." });
        break;
      case "triggerDance":
        window.dispatchEvent(new CustomEvent("mascot-dance"));
        break;
      case "startOxygenTank":
        onAppend({ role: "user", content: "Start an Oxygen Tank dive session." });
        break;

      // Dumby Tools
      case "resourceChamber":
        onOpenResourceChamber();
        break;
      case "summarizePDF":
        onAppend({ role: "user", content: "Please summarize the PDF in the selected resource node." });
        break;
      case "summarizeVideo":
        onAppend({ role: "user", content: "Summarize the YouTube video from this link." });
        break;
      case "extractHighlights":
        onAppend({ role: "user", content: "Extract key highlights from this resource." });
        break;
      case "manageQueue":
        onAppend({ role: "user", content: "Organize my inbox queue into Read/Watch/Do." });
        break;

      // Grimpy Tools
      case "generateProjectPlan":
        onOpenThoughtPool?.();
        break;
      case "linkStrategyToResources":
        onAppend({ role: "user", content: "Link my strategic goals to relevant research nodes." });
        break;
      case "suggestResources":
        onAppend({ role: "user", content: "Suggest some external resources for my current goal." });
        break;
      case "groupSimilarTasks":
        onAppend({ role: "user", content: "Semantically group similar tasks on the board." });
        break;
      case "sonarPing":
        onAppend({ role: "user", content: "Perform a Sonar Ping on the selected node." });
        break;
      case "lateralDrift":
        onAppend({ role: "user", content: "Trigger a Lateral Drift synthesis." });
        break;
    }
    onActiveMascotChange(null); // Close panel after click
  };

  const agentTools: Record<MascotVariant, Tool[]> = {
    dumbo: [
      { id: "checkDeadlines", icon: Search, label: "Scan Deadlines" },
      { id: "groupTasks", icon: Network, label: "Group Tasks" },
      { id: "setReminder", icon: Clock, label: "Set Reminder" },
      { id: "prioritizeTasks", icon: AlertTriangle, label: "Prioritize" },
      { id: "triggerDance", icon: Music, label: "Dance!" },
      { id: "startOxygenTank", icon: Sparkles, label: "Oxygen Dive" },
    ],
    dumby: [
      { id: "resourceChamber", icon: Book, label: "Resource Chamber" },
      { id: "summarizePDF", icon: FileText, label: "Summarize PDF" },
      { id: "summarizeVideo", icon: Youtube, label: "Summarize Video" },
      { id: "extractHighlights", icon: Highlighter, label: "Extract Highlights" },
      { id: "manageQueue", icon: ListChecks, label: "Manage Queue" },
    ],
    grimpy: [
      { id: "generateProjectPlan", icon: LayoutTemplate, label: "Generate Plan" },
      { id: "linkStrategyToResources", icon: LinkIcon, label: "Link Strategy" },
      { id: "suggestResources", icon: Lightbulb, label: "Suggest Resources" },
      { id: "groupSimilarTasks", icon: Network, label: "Semantic Group" },
      { id: "sonarPing", icon: MessageSquareQuote, label: "Sonar Ping" },
      { id: "lateralDrift", icon: Shuffle, label: "Lateral Drift" },
    ],
  };

  return (
    <motion.div 
      drag 
      dragMomentum={false}
      dragConstraints={dragConstraints}
      className="fixed bottom-5 left-5 z-[70] pointer-events-none cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-end gap-4 pointer-events-auto">
        {(["dumbo", "dumby", "grimpy"] as MascotVariant[]).map((m) => {
          const isActive = activeMascot === m;
          
          return (
            <div key={m} className="flex flex-col items-center gap-2">
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`mb-1 flex w-[48px] flex-col items-center gap-2 rounded-2xl border p-2 backdrop-blur-xl transition-all duration-300 ${
                      isSurface
                        ? "border-slate-300 bg-white/95 shadow-xl"
                        : "border-cyan-300/20 bg-slate-950/60 shadow-[0_0_24px_rgba(34,211,238,0.2)]"
                    }`}
                  >
                    {agentTools[m].map((tool) => (
                      <button
                        key={tool.id}
                        onPointerDown={(e) => e.stopPropagation()} 
                        onClick={() => handleToolClick(tool.id, m)}
                        className={`group relative flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                          isSurface
                            ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            : "text-cyan-100/70 hover:bg-white/5 hover:text-cyan-50"
                        }`}
                        title={tool.label}
                      >
                        <tool.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                        <div className={`absolute left-full ml-3 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider opacity-0 transition-opacity group-hover:opacity-100 ${
                          isSurface ? "bg-slate-900 text-white" : "bg-cyan-400/30 text-cyan-50 backdrop-blur-md border border-cyan-400/20"
                        }`}>
                          {tool.label}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div
                role="button"
                tabIndex={0}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onActiveMascotChange(isActive ? null : m)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onActiveMascotChange(isActive ? null : m);
                  }
                }}
                aria-label={`Open ${m} panel`}
                className={`group flex flex-col items-center gap-1 rounded-3xl p-2 transition-all duration-300 select-none ${
                  isActive
                    ? isSurface
                      ? "border-slate-400 bg-slate-100 shadow-inner scale-95"
                      : "border-cyan-400/40 bg-white/10 shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-95"
                    : isSurface
                      ? "border-transparent bg-white/40 shadow-sm hover:border-slate-300 hover:bg-white/80"
                      : "border-transparent bg-slate-950/20 hover:border-cyan-300/15 hover:bg-slate-950/35"
                } border backdrop-blur-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400/40`}
              >
                <Mascot
                  variant={m}
                  size={40}
                  className={isSurface ? "" : m === "dumbo" ? "drop-shadow-[0_0_10px_rgba(250,204,21,0.12)]" : m === "dumby" ? "drop-shadow-[0_0_10px_rgba(251,146,60,0.12)]" : ""}
                  showOxygenTank={m === "dumbo"}
                  theme={theme}
                />
                <span className={`text-[8px] font-bold uppercase tracking-tighter transition-colors ${
                  isActive
                    ? isSurface ? "text-slate-900" : "text-cyan-50"
                    : isSurface ? "text-slate-500" : "text-cyan-50/50"
                }`}>
                  {m === "dumbo" ? "Intern" : m === "dumby" ? "Manager" : "Architect"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
