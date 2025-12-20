"use client";

import { useEffect, useState } from "react";

interface DumboOctopusProps {
  id: string;
  onComplete: (id: string) => void;
}

function hashToUnitInterval(input: string): number {
  // Simple, deterministic hash -> [0, 1). Keeps the component render pure (no Math.random()).
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Convert to unsigned 32-bit, then scale to [0, 1)
  return (h >>> 0) / 2 ** 32;
}

export function DumboOctopus({ id, onComplete }: DumboOctopusProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Animation duration: 4s swim + 1s fade = 5s total
    const fadeOutTimer = setTimeout(() => {
      setIsVisible(false);
    }, 4000);

    // Clean up after fade completes
    const cleanupTimer = setTimeout(() => {
      onComplete(id);
    }, 5000);

    return () => {
      clearTimeout(fadeOutTimer);
      clearTimeout(cleanupTimer);
    };
  }, [id, onComplete]);

  // Deterministic per-instance "randomness" derived from `id` (which includes a timestamp in `app/page.tsx`).
  const startSide: "left" | "right" = hashToUnitInterval(id) > 0.5 ? "left" : "right";
  const verticalPosition = hashToUnitInterval(`${id}:y`) * 0.7 + 0.15; // 15% to 85% of viewport height

  return (
    <div
      className={`dumbo-octopus ${startSide === "left" ? "swim-left-to-right" : "swim-right-to-left"} ${isVisible ? "" : "fade-out"}`}
      style={{
        position: "fixed",
        top: `${verticalPosition * 100}%`,
        [startSide]: "-100px",
        zIndex: 1,
        pointerEvents: "none",
        willChange: "transform, opacity",
      }}
      aria-hidden="true"
    >
      {/* Octopus body */}
      <div className="octopus-body">
        {/* Head */}
        <div className="octopus-head" />
        {/* Eyes */}
        <div className="octopus-eye octopus-eye-left" />
        <div className="octopus-eye octopus-eye-right" />
        {/* Tentacles */}
        <div className="octopus-tentacle octopus-tentacle-1" />
        <div className="octopus-tentacle octopus-tentacle-2" />
        <div className="octopus-tentacle octopus-tentacle-3" />
        <div className="octopus-tentacle octopus-tentacle-4" />
      </div>
    </div>
  );
}

