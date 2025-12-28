"use client";

import { useEffect, useRef, useState } from "react";

/**
 * DeepSeaBackground Component
 * Features a "Giant Neon Octopus" that drifts slowly in the abyss,
 * a "Marine Snow" particle effect for depth, and a sonar flashlight
 * mask that follows the user's cursor.
 */
export function DeepSeaBackground() {
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
  const [isHovering, setIsHovering] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track mount state to avoid hydration errors from Math.random()
  useEffect(() => {
    setIsMounted(true);

    const handleButtonHover = (e: any) => {
      setIsButtonHovered(e.detail.isHovered);
    };

    window.addEventListener("dive-button-hover", handleButtonHover);
    return () => window.removeEventListener("dive-button-hover", handleButtonHover);
  }, []);

  // Track mouse movement for the sonar flashlight effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (!isHovering) setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isHovering]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none select-none"
    >
      {/* 
        The "Giant Neon Octopus" (Abstract Dumbo Style) - Drifting Atmosphere 
        Centered but drifts slowly via CSS animation.
      */}
      <div className={`absolute inset-0 z-0 flex items-center justify-center transition-opacity duration-1000 ${isButtonHovered ? "opacity-80 scale-110" : "opacity-30"}`}>
        <div className="relative w-[1000px] h-[1000px] animate-drift transition-opacity duration-1000">
          {/* Ethereal Glowing Ears (Giant) */}
          <div className="absolute top-[10%] left-[10%] w-[300px] h-[200px] bg-cyan-500/20 rounded-full blur-[80px] animate-ear-flap" />
          <div className="absolute top-[10%] right-[10%] w-[300px] h-[200px] bg-cyan-500/20 rounded-full blur-[80px] animate-ear-flap-reverse" />

          {/* Head / Mantle (Super-charged Light Core) */}
          <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-cyan-500/15 rounded-[50%_50%_45%_45%] blur-[100px] shadow-[0_0_200px_rgba(34,211,238,0.4)] animate-pulse" />
          <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[200px] h-[150px] bg-white/10 rounded-full blur-[60px] animate-pulse" style={{ animationDelay: "0.5s" }} />
          
          {/* Faint Internal Bioluminescence */}
          <div className="absolute top-[25%] left-[40%] w-12 h-12 bg-cyan-300/30 rounded-full blur-[15px] animate-pulse" />
          <div className="absolute top-[25%] right-[40%] w-12 h-12 bg-cyan-300/30 rounded-full blur-[15px] animate-pulse" style={{ animationDelay: "1s" }} />

          {/* Light-Trail Tentacles (Giant & Vibrant) */}
          <div className="absolute top-[45%] left-0 w-full h-[600px] flex justify-center gap-16 opacity-50">
            {isMounted && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div 
                key={i}
                className="w-0.5 h-full bg-gradient-to-b from-cyan-400 via-cyan-600/30 to-transparent blur-[20px]"
                style={{ 
                  transform: `rotate(${(i - 3.5) * 10}deg) translateY(${Math.abs(i - 3.5) * 25}px)`,
                  height: `${500 + Math.random() * 150}px`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Marine Snow / Organic Particles */}
      <div className="absolute inset-0 z-10 opacity-40">
        {isMounted &&
          [...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-cyan-200/30 rounded-full animate-marine-snow"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                "--drift-x": `${(Math.random() - 0.5) * 100}px`,
                "--drift-y": `${-100 - Math.random() * 200}px`,
                "--duration": `${10 + Math.random() * 20}s`,
                "--delay": `${Math.random() * -20}s`,
                animationDuration: "var(--duration)",
                animationDelay: "var(--delay)",
              } as any}
            />
          ))}
      </div>

      {/* Sonar Flashlight Mask */}
      <div
        className="absolute inset-0 z-20 transition-opacity duration-700 pointer-events-none"
        style={{
          background: isHovering
            ? `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, rgba(0, 0, 0, 0.96) 80%, rgba(0, 0, 0, 0.98) 100%)`
            : "rgba(0, 0, 0, 0.98)",
        }}
      />
      
      {/* Static Fallback for mobile/non-pointer devices */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950 via-slate-950 to-black sm:hidden" />

      {/* Depth UI: Distant light beams */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-px h-screen bg-gradient-to-b from-cyan-500/20 to-transparent rotate-12" />
        <div className="absolute top-0 right-1/3 w-px h-screen bg-gradient-to-b from-cyan-400/10 to-transparent -rotate-6" />
      </div>

      {/* Ambient Swimming Light-Beings (Abstract Dumbo Octopi) */}
      {isMounted && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className={`absolute animate-swim-celebration transition-all duration-1000 ${isButtonHovered ? "opacity-100 scale-125" : "opacity-40"}`}
              style={{
                top: `${5 + (i * 85 / 15)}%`,
                left: i % 2 === 0 ? "-250px" : "auto",
                right: i % 2 === 0 ? "auto" : "-250px",
                "--swim-direction": i % 2 === 0 ? "1" : "-1",
                "--duration": `${12 + (i % 5) * 6}s`,
                "--delay": `${i * -3}s`,
                "--scale": `${0.5 + (i % 3) * 0.4}`, // Varying depths
                transform: `scale(var(--scale))`,
                animationDuration: "var(--duration)",
                animationDelay: "var(--delay)",
              } as any}
            >
              {/* Ethereal Deep-Sea Entity */}
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Core Bioluminescence */}
                <div className="absolute inset-0 bg-cyan-500/30 blur-[50px] rounded-full animate-pulse" />
                <div className="absolute inset-4 bg-cyan-400/50 blur-[30px] rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                
                {/* Twinkling Photophores (Light Organs) */}
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white blur-[2px] rounded-full animate-twinkle" style={{ "--duration": "1.5s" } as any} />
                <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-cyan-200 blur-[1px] rounded-full animate-twinkle" style={{ "--duration": "2.2s", animationDelay: "0.5s" } as any} />
                <div className="absolute bottom-1/2 left-1/2 w-1 h-1 bg-white blur-[1px] rounded-full animate-twinkle" style={{ "--duration": "3s", animationDelay: "1s" } as any} />
                
                {/* Abstract Body Shape (Bell-ish) */}
                <div className="relative z-10 w-20 h-16 bg-cyan-200/20 rounded-[50%_50%_45%_45%/60%_60%_40%_40%] blur-md shadow-[0_0_40px_rgba(34,211,238,0.8)] animate-pulse">
                  {/* Blinking Eyes */}
                  <div className="absolute top-[45%] left-1/4 w-2 h-2 bg-black rounded-full flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-cyan-400/40 animate-eye-blink" />
                  </div>
                  <div className="absolute top-[45%] right-1/4 w-2 h-2 bg-black rounded-full flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-cyan-400/40 animate-eye-blink" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>

                {/* Ethereal Fins (Floating Light) */}
                <div className="absolute top-[-15px] left-[-15px] w-20 h-16 bg-cyan-400/20 rounded-full blur-2xl animate-ear-flap" />
                <div className="absolute top-[-15px] right-[-15px] w-20 h-16 bg-cyan-400/20 rounded-full blur-2xl animate-ear-flap-reverse" />

                {/* Light-Trail Tentacles (Umbrella Pulse) */}
                <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 w-20 h-36 flex justify-around opacity-80 animate-umbrella-pulse">
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <div 
                      key={idx}
                      className="w-0.5 h-full bg-gradient-to-b from-cyan-300 via-cyan-500/40 to-transparent blur-[3px] animate-tentacle-wave"
                      style={{ 
                        animationDelay: `${idx * 0.25}s`,
                        transform: `rotate(${(idx - 2) * 15}deg) translateY(${idx * 6}px)`
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
