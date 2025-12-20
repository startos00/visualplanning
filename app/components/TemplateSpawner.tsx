"use client";

import { useState } from "react";

import type { ThinkingPattern, ThinkingRole } from "@/app/lib/templates";

export type TemplateSpawnerProps = {
  onSpawnPattern: (args: { role: ThinkingRole; pattern: Exclude<ThinkingPattern, "blank"> }) => void;
};

export function TemplateSpawner(props: TemplateSpawnerProps) {
  const { onSpawnPattern } = props;

  const [currentRole, setCurrentRole] = useState<ThinkingRole>("General");
  const [patternChoice, setPatternChoice] = useState<ThinkingPattern>("blank");

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-cyan-300/20 bg-slate-950/40 px-3 py-2 backdrop-blur-md shadow-[0_0_18px_rgba(34,211,238,0.18)]">
        <div className="flex items-center gap-2">
          <div className="text-[11px] tracking-widest text-cyan-100/70">ROLE</div>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value as ThinkingRole)}
            className="rounded-full border border-cyan-300/15 bg-slate-950/30 px-3 py-1 text-xs text-cyan-50 outline-none hover:bg-slate-950/45 focus:border-cyan-200/40"
            title="Role context"
          >
            <option value="General">General</option>
            <option value="Designer/Architect">Designer/Architect</option>
            <option value="Scientist/Academic">Scientist/Academic</option>
            <option value="Founder">Founder</option>
            <option value="Engineer">Engineer</option>
          </select>
        </div>

        <div className="h-5 w-px bg-cyan-300/15" />

        <div className="flex items-center gap-2">
          <div className="text-[11px] tracking-widest text-cyan-100/70">SPAWN PATTERN</div>
          <select
            value={patternChoice}
            onChange={(e) => {
              const next = e.target.value as ThinkingPattern;
              setPatternChoice(next);
              if (next === "blank") return;

              onSpawnPattern({ role: currentRole, pattern: next });
              setPatternChoice("blank");
            }}
            className="rounded-full border border-rose-300/15 bg-slate-950/30 px-3 py-1 text-xs text-rose-50 outline-none hover:bg-slate-950/45 focus:border-rose-200/40"
            title="Spawn a thinking pattern template"
          >
            <option value="blank">Blank canvas</option>
            <option value="divergent">Divergent (Explorer)</option>
            <option value="convergent">Convergent (Builder)</option>
          </select>
        </div>
      </div>
    </div>
  );
}


