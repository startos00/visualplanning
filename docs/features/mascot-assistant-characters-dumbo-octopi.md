# Feature Requirement Document (FRED): Mascot assistant characters (Dumbo octopi)

## Feature Name
Mascot assistant characters (Dumbo octopi)

## Goal
Provide a reusable, inline-SVG mascot component that renders one of three distinct “dumbo octopus” assistant characters with consistent styling, clear personality cues, and built-in animations—without relying on external image assets.

This feature exists to:
- Add a cohesive, playful visual identity to assistant/guide UI elements
- Ensure mascots are lightweight (no image downloads), themeable via Tailwind, and easy to embed anywhere in the React app
- Support multiple personalities/roles (intern/manager/architect) through a simple variant API

## User Story
As a product designer or engineer, I want to render a mascot assistant character by selecting a `variant`, so that different parts of the UI can communicate distinct “assistant roles” (cute helper, manager, architect) while keeping implementation consistent and asset-free.

## Functional Requirements
- **Single-file component**: Implement a single React component file named `Mascot.tsx`.
- **No external assets**: Must not import images or reference external SVG files; all shapes are drawn manually within inline SVG.
- **Props API**:
  - `variant`: `'dumbo' | 'dumby' | 'grimpy'` (required)
  - `size`: `number` (optional, default `64`) controls rendered width/height in pixels
  - `className`: `string` (optional) appended to the root element for layout/styling overrides
- **Renders exactly three distinct characters** (selected by `variant`):
  - `dumbo` (The Intern)
  - `dumby` (The Manager)
  - `grimpy` (The Architect)
- **Inline SVG composition**:
  - Use a simplified Grimpoteuthis silhouette as the base concept: bell-shaped mantle, large “ear fins”, stubby tentacles with webbing.
  - Each variant must visibly differ in expression, silhouette, and accent details as specified below.
- **Tailwind-first styling**:
  - Primary fills/strokes should rely on Tailwind classes (e.g., `fill-yellow-300`, `fill-orange-400`, `fill-cyan-900/20`).
  - The component should be compatible with Tailwind’s animation utility classes (including arbitrary values like `animate-[bounce_2s_infinite]`).
- **Animations**:
  - Each variant has specific animation requirements (see “Character Visual Specifications”).
  - Animations should be applied to SVG groups/parts so that motion feels intentional (e.g., ear fins flap separately from body).
- **Grimpy neon glow filter**:
  - Must define an SVG `<filter>` inside `<defs>` to achieve a neon-glow effect (drop shadow + blur or equivalent layered glow).
  - The filter must be applied to Grimpy’s body shape.
- **Hover “name/hello” label**:
  - On hover, the mascot must reveal its name (Dumbo/Dumby/Grimpy) and/or a short greeting.
  - Must not rely on external assets.
  - Baseline requirement: include an SVG `<title>` so browsers show a native hover tooltip, and the same text is available to assistive tech.

## Data Requirements (optional)
None. This feature is purely presentational and uses no persistence.

## User Flow
- **Embedding**:
  1. Developer imports `Mascot` from its module location.
  2. Developer renders `<Mascot variant="dumbo" />` (or `dumby`/`grimpy`) within a UI surface (header, empty state, assistant panel, etc.).
  3. Optional: Developer passes `size` to match layout scale and `className` for alignment (e.g. `mx-auto`, `opacity-80`, `drop-shadow-*` wrappers if desired).
- **Interaction**:
  1. User sees mascot in idle state (particularly relevant to Grimpy’s ghostly presentation).
  2. User hovers the mascot (or the parent surface) and perceives an “active” state, especially the neon bloom for Grimpy.
  3. On hover, user also sees the mascot’s name/greeting (e.g., via tooltip or a small label).

## Character Visual Specifications

### Shared design concept (all variants)
- **Shape**: Simplified Grimpoteuthis silhouette; large ear fins, bell-shaped mantle, stubby webbed tentacles.
- **Two-state intent**:
  - **Idle**: Subtle/low prominence (especially for Grimpy).
  - **Active (hover)**: Enhanced glow/bloom (especially for Grimpy) using stacked shadow/blur to create a “gas” aura around lines.

### 1) Variant: `dumbo` (The Intern)
- **Vibe**: Cute, yellow, round, energetic.
- **Visuals**:
  - Yellow body fill: `fill-yellow-300`
  - Wide innocent eyes (large circular whites, small pupils)
  - Tiny smile
  - Pink blush cheeks
- **Animation**:
  - Apply `animate-[bounce_2s_infinite]` to the main SVG group to make the character bounce excitedly.
  - Ear-fins flap using `animate-pulse` on fin elements (or fin group).
- **Details**:
  - Rounder mantle/head than other variants.

### 2) Variant: `dumby` (The Manager)
- **Vibe**: Orange, structured, focused, rigid.
- **Visuals**:
  - Orange body fill: `fill-orange-400`
  - Taller/squarer head shape (noticeably less round)
  - Squinting/focused eyes with rectangles used as eyelids (e.g., rectangular lids over/near eyes)
  - Straight-line mouth (no smile curve)
  - Small red triangle “tie” or badge at the bottom
- **Animation**:
  - Apply `animate-[pulse_4s_infinite]` to the character group for a slow, serious breathing effect.
- **Details**:
  - Overall silhouette should feel slightly more angular/structured than `dumbo`.

### 3) Variant: `grimpy` (The Architect)
- **Vibe**: Cyan, ghostly, bioluminescent, deep-sea.
- **Visuals**:
  - Semi-transparent cyan body fill: `fill-cyan-900/20`
  - Ghost-like silhouette with softer presence (lower opacity baseline)
  - No pupils; glowing white slits for eyes
  - Visible “brain” circle inside the head (distinct internal circle element)
- **Special effect (required)**:
  - Define an SVG `<filter>` inside `<defs>` creating a neon glow (drop-shadow + blur).
  - Apply the filter to the body (mantle) to produce a cyan neon bloom.
  - On hover, intensify the bloom (e.g., by switching filter strength or adding stacked shadows) to emulate a “gas” aura around lines.
- **Animation**:
  - Slow floating/hovering animation, using a long bounce duration (e.g., `animate-[bounce_6s_infinite]` or similar long-cycle bounce).

## Acceptance Criteria
- **API & file constraints**:
  - A single file `Mascot.tsx` exists and exports a React component.
  - No external image assets are imported or referenced.
  - The component accepts `variant`, `size` (default 64), and `className`.
- **Rendering**:
  - `variant="dumbo"` renders a yellow, round, cute octopus with blush cheeks, wide eyes, and a small smile.
  - `variant="dumby"` renders an orange, more angular/tall octopus with squinting eyes (rect eyelids), straight mouth, and a small red triangle tie/badge.
  - `variant="grimpy"` renders a semi-transparent cyan ghost-like octopus with glowing white slit eyes and a visible internal brain circle.
- **Animation behaviors**:
  - `dumbo` bounces with `animate-[bounce_2s_infinite]` and has pulsing/flapping fins.
  - `dumby` pulses slowly with `animate-[pulse_4s_infinite]`.
  - `grimpy` floats with a long-duration bounce-like animation.
- **Neon glow (grimpy)**:
  - The SVG contains a `<defs><filter>...</filter></defs>` definition.
  - The filter is applied to Grimpy’s body and creates a visible glow/bloom.
  - The hover/active state increases the perceived glow intensity.
- **Hover label**:
  - Hovering the mascot surfaces a name or greeting for the selected variant (at minimum via native tooltip):
    - `dumbo`: “Dumbo” (or “Hi, I’m Dumbo”)
    - `dumby`: “Dumby” (or “Hi, I’m Dumby”)
    - `grimpy`: “Grimpy” (or “Hi, I’m Grimpy”)
- **Tailwind compatibility**:
  - Uses Tailwind classes for fills and animations (including arbitrary animation values).
  - `className` is applied in a way that allows consumers to control layout (e.g., `inline-block`, margins, positioning).

## Edge Cases
- **Invalid variant**: TypeScript should prevent invalid values; runtime should fall back to a safe default (or render nothing) if somehow misused.
- **Size extremes**:
  - Very small sizes (e.g., 16–24): still recognizable; strokes/eyes shouldn’t overlap badly.
  - Very large sizes (e.g., 256+): glow filter scales sensibly without clipping (filter region should be generous to avoid cutoff).
- **Hover environment**:
  - On touch devices with no hover, the component should still look acceptable in idle state.
  - If hover styles are applied via Tailwind `group-hover`, component should support being nested in a `group` container.
  - If only native tooltip is used, it may not appear on all touch devices; this is acceptable as long as accessibility text exists.
- **CSS/animation availability**:
  - If Tailwind arbitrary animations are restricted by config, the component should have a documented expectation (or provide sensible default classes that still animate under standard Tailwind settings).

## Non-Functional Requirements (optional)
- **Performance**: SVG should be lightweight; avoid excessive filters except where required for Grimpy glow.
- **Accessibility**:
  - Provide a sensible `aria-label` or `title`/`desc` for screen readers (e.g., “Mascot: Dumbo”).
  - Decorative usage should be supported (e.g., allow `aria-hidden` via `className`/props extension if desired).
- **Maintainability**:
  - Keep all SVG paths and variant logic in one file as required, but structure code with clear subcomponents or functions to reduce clutter.


