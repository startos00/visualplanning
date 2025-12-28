"use client";

import { useEffect, useMemo } from "react";
import { authClient } from "../../lib/auth-client";
import { useRouter } from "next/navigation";

export function DecompressionOverlay() {
  const router = useRouter();
  
  // Check for prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Generate 25-30 random bubbles
  const bubbles = useMemo(() => {
    if (prefersReducedMotion) return [];
    return Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${0.5 + Math.random() * 0.7}s`,
      delay: `${Math.random() * 1.5}s`,
      size: `${4 + Math.random() * 12}px`,
    }));
  }, [prefersReducedMotion]);

  useEffect(() => {
    const performLogout = async () => {
      // Wait for the animation to complete (skip delay if reduced motion)
      const delay = prefersReducedMotion ? 0 : 1500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      try {
        await authClient.signOut();
        router.push("/login");
      } catch (error) {
        console.error("Logout failed:", error);
        // Even if it fails, try to redirect
        router.push("/login");
      }
    };

    performLogout();
  }, [router, prefersReducedMotion]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-auto overflow-hidden animate-surface-fade bg-white/0">
      <div className="absolute inset-0 bg-transparent">
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="absolute bottom-0 rounded-full bg-cyan-100/40 animate-rapid-bubble"
            style={{
              left: bubble.left,
              width: bubble.size,
              height: bubble.size,
              "--duration": bubble.duration,
              animationDelay: bubble.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

