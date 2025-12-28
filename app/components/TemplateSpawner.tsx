"use client";

import { useState } from "react";

import type { ThinkingPattern, ThinkingRole } from "@/app/lib/templates";
import { AbyssalDropdown } from "./ui/AbyssalDropdown";

export type TemplateSpawnerProps = {
  onSpawnPattern: (args: { role: ThinkingRole; pattern: Exclude<ThinkingPattern, "blank"> }) => void;
};

const ROLE_OPTIONS = [
  { label: "General", value: "General" },
  { label: "Designer/Architect", value: "Designer/Architect" },
  { label: "Scientist/Academic", value: "Scientist/Academic" },
  { label: "Founder", value: "Founder" },
  { label: "Engineer", value: "Engineer" },
];

const PATTERN_OPTIONS = [
  { label: "Blank canvas", value: "blank" },
  { label: "Divergent (Explorer)", value: "divergent" },
  { label: "Convergent (Builder)", value: "convergent" },
];

export function TemplateSpawner(props: TemplateSpawnerProps) {
  const { onSpawnPattern } = props;

  const [currentRole, setCurrentRole] = useState<ThinkingRole>("General");
  const [patternChoice, setPatternChoice] = useState<ThinkingPattern>("blank");

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-50 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-cyan-300/20 bg-slate-950/40 px-4 py-2 backdrop-blur-md shadow-[0_0_18px_rgba(34,211,238,0.18)]">
        <AbyssalDropdown
          label="ROLE"
          value={currentRole}
          options={ROLE_OPTIONS}
          onChange={(val) => setCurrentRole(val as ThinkingRole)}
          title="Role context"
        />

        <div className="h-5 w-px bg-cyan-300/15" />

        <AbyssalDropdown
          label="SPAWN PATTERN"
          value={patternChoice}
          options={PATTERN_OPTIONS}
          onChange={(val) => {
            const next = val as ThinkingPattern;
            setPatternChoice(next);
            if (next === "blank") return;

            onSpawnPattern({ role: currentRole, pattern: next });
            setPatternChoice("blank");
          }}
          title="Spawn a thinking pattern template"
          className="text-rose-50"
        />
      </div>
    </div>
  );
}


