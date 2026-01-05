"use client";

import { useId, useState, useEffect } from "react";
import { useOxygenTank } from "@/app/lib/hooks/useOxygenTank";
import { OxygenTankGauge } from "./OxygenTankGauge";

export type MascotVariant = "dumbo" | "dumby" | "grimpy";

export type MascotProps = {
  variant: MascotVariant;
  size?: number;
  className?: string;
  showOxygenTank?: boolean;
};

function sanitizeSvgId(id: string) {
  // React's useId() can include ":" which is valid in SVG IDs but can be awkward in tooling.
  return id.replace(/[^a-zA-Z0-9_-]/g, "");
}

export function Mascot(props: MascotProps) {
  const { variant, size = 64, className, showOxygenTank = false } = props;

  const { status, isPinned } = useOxygenTank();
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (status === "completed") {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const uid = sanitizeSvgId(useId());
  const glowSoftId = `grimpyGlowSoft-${uid}`;
  const glowStrongId = `grimpyGlowStrong-${uid}`;

  const safeVariant: MascotVariant =
    variant === "dumbo" || variant === "dumby" || variant === "grimpy" ? variant : "dumbo";

  const name = safeVariant === "dumbo" ? "Dumbo" : safeVariant === "dumby" ? "Dumby" : "Grimpy";
  const role = safeVariant === "dumbo" ? "Intern" : safeVariant === "dumby" ? "Manager" : "Architect";
  const hello = `Hi, I'm ${name}`;

  return (
    <span className={["group relative inline-block select-none", className].filter(Boolean).join(" ")}>
      {/* Oxygen Tank Gauge - Positioned above the mascot, shifted slightly right */}
      {showOxygenTank && variant === "dumbo" && (
        <div
          className={[
            "absolute bottom-full left-0 mb-2 w-48 transition-all duration-200 z-50",
            // This invisible bridge (before:...) ensures the hover state isn't lost in the gap
            "before:absolute before:-bottom-2 before:left-0 before:right-0 before:h-2 before:content-['']",
            isPinned 
              ? "opacity-100 pointer-events-auto" 
              : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 delay-75 group-hover:delay-0",
          ].join(" ")}
          style={isPinned ? { opacity: 1, pointerEvents: "auto" } : {}}
        >
          <OxygenTankGauge />
        </div>
      )}

      {/* Cross-browser hover label */}
      <span
        className={[
          "pointer-events-none absolute left-1/2 top-0 z-10",
          "-translate-x-1/2 -translate-y-2",
          "whitespace-nowrap rounded-md bg-slate-900/80 px-2 py-1 text-[11px] leading-none text-white",
          "opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-150",
          (showOxygenTank && variant === "dumbo") ? "hidden" : "group-hover:opacity-100",
        ].join(" ")}
        style={(showOxygenTank && variant === "dumbo") ? { display: "none" } : {}}
      >
        {hello}
      </span>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        className={["block", isShaking ? "animate-shake" : ""].join(" ")}
        role="img"
        aria-label={`${hello} (${role})`}
        focusable="false"
      >
        {/* Native browser hover tooltip */}
        <title>{hello}</title>

        {/* Only used by grimpy, but harmless to include for all variants. */}
        <defs>
          <filter
            id={glowSoftId}
            x={-24}
            y={-24}
            width={112}
            height={112}
            filterUnits="userSpaceOnUse"
          >
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="rgba(34,211,238,0.35)" />
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="rgba(34,211,238,0.25)" />
          </filter>

          <filter
            id={glowStrongId}
            x={-30}
            y={-30}
            width={124}
            height={124}
            filterUnits="userSpaceOnUse"
          >
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="rgba(34,211,238,0.55)" />
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="rgba(34,211,238,0.45)" />
            <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="rgba(34,211,238,0.30)" />
          </filter>
        </defs>

        {safeVariant === "dumbo" ? (
          <g className="animate-[bounce_2s_infinite]">
            {/* Ear fins */}
            <g className="animate-pulse">
              <path
                d="M14 26 C8 24, 8 36, 15 34 C18 33, 18 28, 14 26 Z"
                className="fill-yellow-200"
              />
              <path
                d="M50 26 C56 24, 56 36, 49 34 C46 33, 46 28, 50 26 Z"
                className="fill-yellow-200"
              />
            </g>

            {/* Mantle */}
            <path
              d="M32 10 C22 10, 14 18, 14 29 C14 41, 23 50, 32 50 C41 50, 50 41, 50 29 C50 18, 42 10, 32 10 Z"
              className="fill-yellow-300 stroke-slate-900/15"
              strokeWidth="1"
            />

            {/* Tentacles + webbing */}
            <g className="fill-yellow-200 stroke-slate-900/10" strokeWidth="1">
              <path d="M20 44 C18 52, 22 56, 25 54 C27 52, 25 48, 24 44 Z" />
              <path d="M26 46 C25 54, 29 57, 31 55 C33 53, 31 49, 30 46 Z" />
              <path d="M34 46 C33 54, 37 57, 39 55 C41 53, 39 49, 38 46 Z" />
              <path d="M40 44 C39 52, 43 56, 46 54 C48 52, 46 48, 44 44 Z" />
              <path d="M20 44 C25 48, 39 48, 44 44" className="fill-yellow-200/70" />
            </g>

            {/* Face */}
            <g>
              <circle cx="25" cy="28" r="6" className="fill-white/95" />
              <circle cx="39" cy="28" r="6" className="fill-white/95" />
              <circle cx="26.5" cy="29.5" r="2" className="fill-slate-900/80" />
              <circle cx="40.5" cy="29.5" r="2" className="fill-slate-900/80" />
              <path
                d="M28 36 C30 38, 34 38, 36 36"
                className="stroke-slate-900/60"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="20.5" cy="34.5" r="2.2" className="fill-pink-300/70" />
              <circle cx="43.5" cy="34.5" r="2.2" className="fill-pink-300/70" />
            </g>
          </g>
        ) : safeVariant === "dumby" ? (
          <g className="animate-[pulse_4s_infinite]">
            {/* Ear fins (more rigid) */}
            <path d="M14 26 L8 30 L14 34 Z" className="fill-orange-300" />
            <path d="M50 26 L56 30 L50 34 Z" className="fill-orange-300" />

            {/* Mantle (taller + squarer) */}
            <path
              d="M22 12 H42 C47 12, 50 18, 50 26 V34 C50 44, 42 52, 32 52 C22 52, 14 44, 14 34 V26 C14 18, 17 12, 22 12 Z"
              className="fill-orange-400 stroke-slate-900/18"
              strokeWidth="1"
            />

            {/* Tentacles */}
            <g className="fill-orange-300 stroke-slate-900/12" strokeWidth="1">
              <path d="M19 44 C18 52, 22 56, 25 54 C27 52, 25 48, 24 44 Z" />
              <path d="M26 46 C25 54, 29 57, 31 55 C33 53, 31 49, 30 46 Z" />
              <path d="M34 46 C33 54, 37 57, 39 55 C41 53, 39 49, 38 46 Z" />
              <path d="M41 44 C40 52, 44 56, 47 54 C49 52, 47 48, 46 44 Z" />
              <path d="M19 44 C25 48, 39 48, 46 44" className="fill-orange-300/70" />
            </g>

            {/* Face: focused squint + straight mouth */}
            <g>
              <circle cx="25" cy="28" r="5.5" className="fill-white/95" />
              <circle cx="39" cy="28" r="5.5" className="fill-white/95" />
              <circle cx="26.5" cy="29.5" r="1.8" className="fill-slate-900/80" />
              <circle cx="40.5" cy="29.5" r="1.8" className="fill-slate-900/80" />
              {/* Rectangular eyelids */}
              <rect x="19.5" y="23.8" width="11" height="3.3" rx="1" className="fill-orange-500/70" />
              <rect x="33.5" y="23.8" width="11" height="3.3" rx="1" className="fill-orange-500/70" />
              <path
                d="M26 37 H38"
                className="stroke-slate-900/55"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </g>

            {/* Tie / badge */}
            <path d="M32 52 L28.5 58 L35.5 58 Z" className="fill-red-500/80" />
          </g>
        ) : (
          <g className="animate-[bounce_6s_infinite] opacity-70 transition-opacity duration-300 group-hover:opacity-100">
            {/* Ear fins */}
            <path d="M14 26 C8 24, 8 36, 15 34 C18 33, 18 28, 14 26 Z" className="fill-cyan-800/20" />
            <path d="M50 26 C56 24, 56 36, 49 34 C46 33, 46 28, 50 26 Z" className="fill-cyan-800/20" />

            {/* Mantle: base glow + hover intensifier */}
            <g>
              <path
                d="M32 10 C22 10, 14 18, 14 29 C14 41, 23 50, 32 50 C41 50, 50 41, 50 29 C50 18, 42 10, 32 10 Z"
                className="fill-cyan-900/20"
                filter={`url(#${glowSoftId})`}
              />
              <path
                d="M32 10 C22 10, 14 18, 14 29 C14 41, 23 50, 32 50 C41 50, 50 41, 50 29 C50 18, 42 10, 32 10 Z"
                className="fill-cyan-400/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                filter={`url(#${glowStrongId})`}
              />
            </g>

            {/* Brain circle */}
            <circle cx="32" cy="22" r="6.5" className="fill-cyan-200/15 stroke-cyan-200/25" strokeWidth="1" />

            {/* Tentacles + webbing */}
            <g className="fill-cyan-800/15 stroke-cyan-200/15" strokeWidth="1">
              <path d="M20 44 C18 52, 22 56, 25 54 C27 52, 25 48, 24 44 Z" />
              <path d="M26 46 C25 54, 29 57, 31 55 C33 53, 31 49, 30 46 Z" />
              <path d="M34 46 C33 54, 37 57, 39 55 C41 53, 39 49, 38 46 Z" />
              <path d="M40 44 C39 52, 43 56, 46 54 C48 52, 46 48, 44 44 Z" />
              <path d="M20 44 C25 48, 39 48, 44 44" className="fill-cyan-800/10" />
            </g>

            {/* Eyes: glowing white slits (no pupils) */}
            <g>
              <rect x="20" y="27" width="12" height="3.2" rx="1.6" className="fill-white/80" />
              <rect x="32" y="27" width="12" height="3.2" rx="1.6" className="fill-white/80" />
            </g>
          </g>
        )}
      </svg>
    </span>
  );
}


