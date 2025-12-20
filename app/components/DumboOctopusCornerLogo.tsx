"use client";

import * as React from "react";

export type DumboOctopusCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type DumboOctopusCornerLogoProps = {
  corner?: DumboOctopusCorner;
  size?: number; // px
  inset?: number | { x: number; y: number }; // px
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLElement>;
  href?: string;
  ariaLabel?: string;
  decorative?: boolean;
  idleOpacity?: number; // 0..1
  activeIntensity?: number; // 0..2 (soft cap)
};

type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function normalizeInset(inset: DumboOctopusCornerLogoProps["inset"]) {
  if (typeof inset === "number") return { x: inset, y: inset };
  if (inset && typeof inset === "object") return { x: inset.x, y: inset.y };
  return { x: 16, y: 16 };
}

function cornerPositionStyle(corner: DumboOctopusCorner, inset: { x: number; y: number }) {
  const s: React.CSSProperties = { position: "fixed" };
  if (corner.startsWith("top")) s.top = inset.y;
  else s.bottom = inset.y;

  if (corner.endsWith("left")) s.left = inset.x;
  else s.right = inset.x;

  return s;
}

/**
 * Bioluminescent corner Dumbo Octopus logo (inline SVG + component-scoped CSS).
 * Drop-in usage:
 *   <DumboOctopusCornerLogo />
 *   <DumboOctopusCornerLogo corner="top-left" href="/about" />
 */
export function DumboOctopusCornerLogo(props: DumboOctopusCornerLogoProps) {
  const {
    corner = "bottom-right",
    size = 48,
    inset = 16,
    className,
    style,
    onClick,
    href,
    ariaLabel = "Dumbo Octopus logo",
    decorative = false,
    idleOpacity = 0.25,
    activeIntensity = 1,
  } = props;

  const isInteractive = Boolean(href || onClick);
  const Tag = (href ? "a" : isInteractive ? "button" : "div") as
    | "a"
    | "button"
    | "div";

  const insetXY = normalizeInset(inset);
  const idle = clamp(idleOpacity, 0, 1);
  const intensity = clamp(activeIntensity, 0, 2);

  // Tune these once and keep logic JS-only so the CSS stays simple + portable.
  const activeOpacity = clamp(idle + 0.55 * intensity, 0, 1);
  const glow1 = clamp(0.18 * intensity, 0, 1);
  const glow2 = clamp(0.33 * intensity, 0, 1);
  const glow3 = clamp(0.44 * intensity, 0, 1);
  const glow4 = clamp(0.28 * intensity, 0, 1);

  const baseStyle: CSSVars = {
    ...cornerPositionStyle(corner, insetXY),
    width: size,
    height: size,
    zIndex: 40,
    // Provide variables for the scoped CSS below (works across <div>/<button>/<a>).
    "--dcl-idle-opacity": idle,
    "--dcl-active-opacity": activeOpacity,
    "--dcl-glow-1": glow1,
    "--dcl-glow-2": glow2,
    "--dcl-glow-3": glow3,
    "--dcl-glow-4": glow4,
    ...style,
  };

  const ariaHidden = decorative ? true : undefined;
  const ariaLabelValue = decorative ? undefined : ariaLabel;
  const role = !decorative && !isInteractive ? "img" : undefined;

  const commonProps: Record<string, unknown> = {
    className: ["dcl", isInteractive ? "dclInteractive" : "", className].filter(Boolean).join(" "),
    style: baseStyle,
    onClick,
    "aria-hidden": ariaHidden,
    "aria-label": ariaLabelValue,
    role,
  };

  return (
    <Tag {...(href ? { href } : null)} {...(Tag === "button" ? { type: "button" } : null)} {...commonProps}>
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="dclSvg"
        aria-hidden="true"
        focusable="false"
      >
        {/* Simplified Dumbo silhouette: ear fins + bell mantle + webbed tentacles */}
        <g fill="currentColor">
          {/* Wing-like fins (bigger + more "flappy" like the reference photo) */}
          <path d="M18 22 C10 18, 6 24, 7.5 30 C9 36, 15 39, 20 36 C23 34, 23 26, 18 22 Z" />
          <path d="M46 22 C54 18, 58 24, 56.5 30 C55 36, 49 39, 44 36 C41 34, 41 26, 46 22 Z" />

          {/* Mantle + umbrella arms as a single silhouette (rounded head + scalloped webbing) */}
          <path
            d="
              M32 7
              C26 7, 21.5 9.5, 18.8 13.2
              C16.8 15.9, 16 19.1, 16.2 22.4
              C16.6 28.8, 21 35.2, 32 37.2
              C43 35.2, 47.4 28.8, 47.8 22.4
              C48 19.1, 47.2 15.9, 45.2 13.2
              C42.5 9.5, 38 7, 32 7
              Z

              M16.8 33.2
              C18.8 30.8, 22.5 30.2, 25.2 32.4
              C27.2 34.1, 29.2 34.9, 32 35
              C34.8 34.9, 36.8 34.1, 38.8 32.4
              C41.5 30.2, 45.2 30.8, 47.2 33.2
              C48.9 35.3, 49.5 38.2, 48.8 41
              C47.8 45, 44.8 48.8, 41.8 51.2
              C39 53.5, 35.8 55.3, 32 55.5
              C28.2 55.3, 25 53.5, 22.2 51.2
              C19.2 48.8, 16.2 45, 15.2 41
              C14.5 38.2, 15.1 35.3, 16.8 33.2
              Z
            "
            fillRule="evenodd"
            clipRule="evenodd"
          />

          {/* Scalloped edge hint (kept subtle: improves “umbrella arms” read at 24–48px) */}
          <path
            d="M18 42 C21 41, 22.5 44.5, 25.5 44 C28 43.6, 29.2 46.6, 32 46.6 C34.8 46.6, 36 43.6, 38.5 44 C41.5 44.5, 43 41, 46 42 C45 46, 40.5 50, 32 50 C23.5 50, 19 46, 18 42 Z"
            opacity="0.12"
          />
        </g>
      </svg>

      <style jsx>{`
        .dcl {
          display: grid;
          place-items: center;
          padding: 0;
          margin: 0;
          border: 0;
          background: transparent;
          border-radius: 9999px;
          color: rgba(248, 250, 252, 1);
          opacity: var(--dcl-idle-opacity);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          will-change: filter, opacity, transform;

          /* Idle state: “barely there”, with at most a subtle halo. */
          filter: drop-shadow(0 0 3px rgba(34, 211, 238, 0.06));
          transition:
            filter 180ms ease,
            opacity 180ms ease,
            transform 140ms ease;
        }

        .dclSvg {
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible; /* prevent glow clipping */
          shape-rendering: geometricPrecision;
        }

        /* Active state: hover/focus/press glow bloom */
        .dcl:hover,
        .dcl:active,
        .dcl:focus-visible {
          opacity: var(--dcl-active-opacity);
          filter:
            drop-shadow(0 0 2px rgba(34, 211, 238, var(--dcl-glow-1)))
            drop-shadow(0 0 6px rgba(34, 211, 238, var(--dcl-glow-2)))
            drop-shadow(0 0 14px rgba(34, 211, 238, var(--dcl-glow-3)))
            drop-shadow(0 0 26px rgba(34, 211, 238, var(--dcl-glow-4)));
        }

        /* Press feedback (esp. touch) */
        .dcl:active {
          transform: scale(0.98);
        }

        /* Interactive affordance */
        .dclInteractive {
          cursor: pointer;
        }

        .dclInteractive:focus-visible {
          outline: 2px solid rgba(34, 211, 238, 0.7);
          outline-offset: 4px;
        }

        @media (prefers-reduced-motion: reduce) {
          .dcl {
            transition:
              filter 80ms ease,
              opacity 80ms ease,
              transform 80ms ease;
          }
        }
      `}</style>
    </Tag>
  );
}


