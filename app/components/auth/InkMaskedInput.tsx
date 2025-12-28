"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface InkMaskedInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

export function InkMaskedInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  required,
}: InkMaskedInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSquidSwimming, setIsSquidSwimming] = useState(false);

  const togglePassword = () => {
    setIsSquidSwimming(true);
    // Wait for squid to pass before toggling visibility
    setTimeout(() => {
      setShowPassword(!showPassword);
    }, 400);
    
    // Reset squid animation state
    setTimeout(() => {
      setIsSquidSwimming(false);
    }, 1000);
  };

  return (
    <div className="relative group">
      <input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full bg-transparent border-b border-cyan-500/20 px-0 py-3 text-cyan-50 placeholder-cyan-200/10 focus:outline-none focus:border-cyan-400 focus:ring-0 transition-all duration-500 selection:bg-cyan-500/30 ${
          !showPassword && value ? "blur-[3px]" : ""
        }`}
        placeholder={placeholder}
      />
      
      {/* Ink Cloud Overlay when hidden */}
      {!showPassword && value && (
        <div className="absolute inset-0 ink-cloud opacity-40 mix-blend-multiply" />
      )}

      {/* The Squid Animation */}
      {isSquidSwimming && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          <div className="animate-ink-squid absolute top-1/2 -translate-y-1/2">
            <svg
              width="40"
              height="20"
              viewBox="0 0 40 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            >
              <path
                d="M10 5C10 2.23858 12.2386 0 15 0H35C37.7614 0 40 2.23858 40 5V15C40 17.7614 37.7614 20 35 20H15C12.2386 20 10 17.7614 10 15V5Z"
                fill="currentColor"
              />
              <path
                d="M0 10L10 2V18L0 10Z"
                fill="currentColor"
                className="opacity-80"
              />
              <circle cx="30" cy="7" r="1.5" fill="black" />
            </svg>
          </div>
        </div>
      )}

      {/* Custom Toggle (instead of eye, but using eye icon for accessibility/clarity, just styled differently) */}
      <button
        type="button"
        onClick={togglePassword}
        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-cyan-500/50 hover:text-cyan-400 transition-colors"
        aria-label={showPassword ? "Hide password" : "Show password"}
      >
        {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
      </button>
    </div>
  );
}

