"use client";

import { useState } from "react";

interface DiveButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
}

/**
 * DiveButton - A cinematic "Hatch" style control for the deep-sea login.
 * Refined composition for better centering and a more balanced, premium feel.
 */
export function DiveButton({ onClick, isLoading, label = "DIVE" }: DiveButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (isLoading) return;
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      onClick();
    }, 150);
  };

  const setHoverState = (isHovered: boolean) => {
    window.dispatchEvent(new CustomEvent("dive-button-hover", { detail: { isHovered } }));
  };

  return (
    <button
      type="button"
      onClick={handlePress}
      onMouseEnter={() => setHoverState(true)}
      onMouseLeave={() => setHoverState(false)}
      disabled={isLoading}
      className={`group relative flex items-center justify-center w-40 h-40 bg-transparent border-none outline-none transition-all duration-500 ${
        isPressed ? "scale-90" : "hover:scale-105 active:scale-95"
      } ${isLoading ? "cursor-wait" : "cursor-pointer"}`}
    >
      {/* Outer Atmosphere Glow - Pulse effect on hover */}
      <div className="absolute inset-0 rounded-full bg-cyan-500/0 blur-3xl group-hover:bg-cyan-500/10 transition-all duration-1000 pointer-events-none" />
      
      {/* Heavy Submersible Hatch Rim - Deep metallic feel */}
      <div className="absolute inset-2 rounded-full border-[8px] border-slate-800 shadow-[0_25px_50px_-12px_rgba(0,0,0,1),inset_0_2px_4px_rgba(255,255,255,0.05)] transition-all group-hover:border-slate-700" />
      
      {/* Inner Pressure Seal Line - Subtle rotation or pulse */}
      <div className={`absolute inset-[24px] rounded-full border border-cyan-500/10 transition-all duration-700 ${
        isLoading ? "animate-spin" : "group-hover:border-cyan-400/40"
      }`} />

      {/* Main Control Surface - Slightly larger for better composition */}
      <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-slate-900 via-slate-950 to-black border border-cyan-500/30 flex items-center justify-center shadow-[inset_0_4px_20px_rgba(0,0,0,0.8)] overflow-hidden transition-all group-hover:border-cyan-300">
        {/* Subtle Scan Line Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent h-full w-full -translate-y-full group-hover:translate-y-full transition-transform duration-[2.5s] ease-in-out" />

        <div className="relative z-10 flex items-center justify-center">
          {/* Centering fix: Apply tracking and then offset the final character's trailing space with a negative margin */}
          <span className="text-cyan-50 text-2xl font-light font-sans tracking-[0.4em] mr-[-0.4em] transition-all group-hover:text-white group-hover:drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] uppercase">
            {isLoading ? "..." : label}
          </span>
        </div>
      </div>

      {/* Decorative Tech Rivets - Minimalist dots around the rim */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <div
          key={deg}
          className="absolute w-1 h-1 bg-slate-950 border border-cyan-500/10 rounded-full transition-all duration-500 group-hover:border-cyan-400/40"
          style={{
            transform: `rotate(${deg}deg) translateY(-64px)`,
          }}
        />
      ))}
    </button>
  );
}
