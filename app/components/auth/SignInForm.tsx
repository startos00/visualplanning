"use client";

import { useState } from "react";
import { authClient } from "@/app/lib/auth-client";
import { useRouter } from "next/navigation";
import { InkMaskedInput } from "./InkMaskedInput";
import { DiveButton } from "./DiveButton";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmerging, setIsSubmerging] = useState(false);
  const router = useRouter();

  const handleAuth = async (type: "signin" | "signup") => {
    setIsLoading(true);
    setError(null);

    try {
      const result =
        type === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({
              email,
              password,
              name: email.split("@")[0],
            });

      if (result.error) {
        setError(result.error.message || `${type} failed`);
        setIsLoading(false);
      } else {
        // Successful auth - trigger submerge transition
        setIsSubmerging(true);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 800);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Submerge Overlay (Full screen fade) */}
      {isSubmerging && (
        <div className="fixed inset-0 z-[100] bg-black submerge-overlay flex flex-col items-center justify-center pointer-events-none">
          <div className="text-cyan-400 font-light tracking-[0.5em] animate-pulse">
            SUBMERGING...
          </div>
          {/* Bubbles could be added here for extra effect */}
        </div>
      )}

      <div className="relative z-10 backdrop-blur-xl bg-slate-900/40 border border-cyan-500/30 rounded-3xl p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Glassmorphism sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-transparent to-white/5 pointer-events-none" />

        <div className="relative z-20 flex flex-col items-center">
          <h1 className="mb-10 text-center text-3xl font-extralight tracking-[0.3em] text-cyan-50 uppercase">
            Access The Abyss
          </h1>

          {error && (
            <div className="mb-8 w-full rounded-xl border border-red-500/20 bg-red-950/10 px-4 py-4 text-xs font-light tracking-widest text-red-200 text-center backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-500">
              {error.toUpperCase()}
            </div>
          )}

          <form className="w-full space-y-8" onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <label
                htmlFor="email"
                className="absolute -top-6 left-0 text-[10px] font-bold tracking-[0.2em] text-cyan-500/60 uppercase"
              >
                Identification
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full bg-transparent border-b border-cyan-500/20 px-0 py-3 text-cyan-50 placeholder-cyan-200/10 focus:outline-none focus:border-cyan-400 focus:ring-0 transition-all duration-500 selection:bg-cyan-500/30"
                placeholder="EMAIL@DOMAIN.COM"
              />
            </div>

            <div className="relative">
              <label
                htmlFor="password"
                className="absolute -top-6 left-0 text-[10px] font-bold tracking-[0.2em] text-cyan-500/70 uppercase"
              >
                Access Code
              </label>
              <InkMaskedInput
                id="password"
                value={password}
                onChange={setPassword}
                required
                disabled={isLoading}
                placeholder="••••••••"
              />
            </div>

            <div className="flex flex-col items-center gap-8 pt-6">
              <DiveButton
                onClick={() => handleAuth("signin")}
                isLoading={isLoading}
              />
              
              <button
                type="button"
                onClick={() => handleAuth("signup")}
                disabled={isLoading}
                className="text-[10px] font-medium tracking-[0.2em] text-cyan-500/50 hover:text-cyan-400 transition-colors uppercase"
              >
                Request New Clearance
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
