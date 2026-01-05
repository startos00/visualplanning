"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from "react";

export type TankStatus = "idle" | "active" | "paused" | "completed";

interface OxygenTankState {
  status: TankStatus;
  duration: number;
  startTime: number | null;
  pausedAt: number | null;
  accumulatedPausedTime: number;
  isPinned: boolean;
}

interface OxygenTankContextType extends OxygenTankState {
  timeLeft: number;
  progress: number;
  startDive: (mins: number) => void;
  pauseDive: () => void;
  resumeDive: () => void;
  resetDive: () => void;
  togglePin: () => void;
}

const STORAGE_KEY = "oxygen_tank_state";

const OxygenTankContext = createContext<OxygenTankContextType | undefined>(undefined);

export function OxygenTankProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OxygenTankState>(() => {
    if (typeof window === "undefined") {
      return {
        status: "idle",
        duration: 25 * 60,
        startTime: null,
        pausedAt: null,
        accumulatedPausedTime: 0,
        isPinned: false,
      };
    }
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          status: "idle",
          duration: 25 * 60,
          startTime: null,
          pausedAt: null,
          accumulatedPausedTime: 0,
          isPinned: false,
          ...parsed,
        };
      } catch (e) {
        console.error("Failed to parse Oxygen Tank state", e);
      }
    }
    return {
      status: "idle",
      duration: 25 * 60,
      startTime: null,
      pausedAt: null,
      accumulatedPausedTime: 0,
      isPinned: false,
    };
  });

  const [timeLeft, setTimeLeft] = useState(0);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Timer logic
  useEffect(() => {
    if (state.status === "idle") {
      setTimeLeft(state.duration);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      if (state.status === "active" && state.startTime) {
        const elapsed = Math.floor(
          (now - state.startTime - state.accumulatedPausedTime) / 1000
        );
        const remaining = Math.max(0, state.duration - elapsed);
        setTimeLeft(remaining);
        if (remaining === 0) {
          setState((s) => ({ ...s, status: "completed" }));
        }
      } else if (state.status === "paused" && state.startTime && state.pausedAt) {
        const elapsedAtPause = Math.floor(
          (state.pausedAt - state.startTime - state.accumulatedPausedTime) / 1000
        );
        setTimeLeft(Math.max(0, state.duration - elapsedAtPause));
      } else if (state.status === "completed") {
        setTimeLeft(0);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [state]);

  const startDive = useCallback((mins: number) => {
    setState((s) => ({
      ...s,
      status: "active",
      duration: mins * 60,
      startTime: Date.now(),
      pausedAt: null,
      accumulatedPausedTime: 0,
    }));
  }, []);

  const pauseDive = useCallback(() => {
    setState((s) => {
      if (s.status !== "active") return s;
      return { ...s, status: "paused", pausedAt: Date.now() };
    });
  }, []);

  const resumeDive = useCallback(() => {
    setState((s) => {
      if (s.status !== "paused" || !s.pausedAt) return s;
      const additionalPausedTime = Date.now() - s.pausedAt;
      return {
        ...s,
        status: "active",
        pausedAt: null,
        accumulatedPausedTime: s.accumulatedPausedTime + additionalPausedTime,
      };
    });
  }, []);

  const resetDive = useCallback(() => {
    setState((s) => ({
      ...s,
      status: "idle",
      startTime: null,
      pausedAt: null,
      accumulatedPausedTime: 0,
    }));
  }, []);

  const togglePin = useCallback(() => {
    setState((s) => ({ ...s, isPinned: !s.isPinned }));
  }, []);

  const progress = state.duration > 0 ? (timeLeft / state.duration) * 100 : 0;

  const value = useMemo(() => ({
    ...state,
    timeLeft,
    progress,
    startDive,
    pauseDive,
    resumeDive,
    resetDive,
    togglePin,
  }), [state, timeLeft, progress, startDive, pauseDive, resumeDive, resetDive, togglePin]);

  return <OxygenTankContext.Provider value={value}>{children}</OxygenTankContext.Provider>;
}

export function useOxygenTank() {
  const context = useContext(OxygenTankContext);
  if (context === undefined) {
    throw new Error("useOxygenTank must be used within an OxygenTankProvider");
  }
  return context;
}

