# Feature Requirement Document (FRED): Bioluminescent Corner Dumbo Octopus Logo (Drop‑in React Component)

## Feature Name
Bioluminescent Corner Dumbo Octopus Logo (Drop‑in React Component)

## Goal
Add a minimalist Dumbo Octopus logo that sits quietly in a corner as ambient brand identity, then “powers up” with a layered cyan-neon bioluminescent bloom when the user interacts with it (hover/focus/press). The component must be a single file that can be dropped into any React project without requiring external assets or additional CSS files.

## User Story
As a product designer or engineer, I want a tiny, unobtrusive Dumbo Octopus corner logo that becomes bioluminescent when interacted with, so that the UI gains a calm deep-sea identity marker without distracting users during normal work.

## Functional Requirements

### 1) Component delivery constraints
- **Single-file component**: Provide a single React component file (one `.tsx` or `.jsx` file) that contains all markup and styling needed for the effect.
- **No external assets**: Must not import images or reference external SVG files. The octopus must be drawn via inline SVG.
- **No required global CSS**: The component must not require edits to global stylesheets. Any CSS needed for glow/animation must be encapsulated (e.g., inline styles, `<style>` inside the component, CSS-in-JS, or Tailwind classes if already present in the host app).
- **Drop-in**: Consumers must be able to copy/paste the file and render `<DumboOctopusCornerLogo />` (or equivalent) without additional setup.

### 2) Placement and “quiet corner” behavior
- **Default positioning**: The logo renders fixed in a corner (default: bottom-right) with a small inset margin (default: 16px).
- **Corner options**: Support at least four corners via a prop, e.g. `corner="top-left" | "top-right" | "bottom-left" | "bottom-right"`.
- **Non-intrusive**:
  - Must not block primary UI interactions by default (reasonable hitbox; no full-screen overlay).
  - Must be visually subtle in idle state (see visual requirements).
- **Clickable (optional)**: If an `onClick` prop is provided, logo acts like a button/link target and must be keyboard accessible.

### 3) Design concept (shape)
- **Silhouette**: A simplified *Grimpoteuthis* (Dumbo octopus) silhouette:
  - Large “Disney” ear fins
  - Bell-shaped mantle
  - Stubby, webbed tentacles
- **Minimalist linework**: Use simplified shapes/paths; avoid high-detail illustration.
- **Scalable**: SVG must remain recognizable and clean from ~24px up to ~128px without aliasing artifacts dominating.

### 4) Visual states

#### Idle state (default)
- **Color**: Deep-sea ghost white (near-white) rendered at low opacity (faint/quiet).
- **Target appearance**: “Barely there” but still identifiable as the Dumbo silhouette.
- **No aggressive glow**: Idle may have *very subtle* halo at most; it should not read as neon.

#### Active state (interaction)
- **Triggers**:
  - Desktop hover (`:hover`)
  - Keyboard focus (`:focus-visible`) when interactive
  - Pointer press (`:active`) or `pointerdown`-style pressed feedback (optional but preferred)
- **Bioluminescent bloom**:
  - Cyan neon multi-layer bloom (“gas” effect) around the silhouette lines.
  - Glow must be achieved by **stacked shadows/filters** (multiple layers) rather than a single shadow.
  - Must clearly look “powered up” relative to idle state.
- **No layout shift**: The active effect must not change layout or move surrounding content (fixed positioning; effect should render via filter/shadow).

### 5) Animation and interaction polish
- **Transition**: Idle → active and active → idle must animate smoothly (opacity/glow intensity) within **120–250ms**.
- **Reduced motion**: Respect `prefers-reduced-motion`:
  - If reduced motion is enabled, transitions should be instant or use minimal duration (≤ 80ms).
- **Pointer events**:
  - If `onClick` is not provided, component may still respond to hover, but must not appear “clickable” (cursor remains default).
  - If `onClick` is provided, cursor should be pointer and focus outline must be visible (or provide a tasteful focus ring).

### 6) Accessibility
- **Keyboard**: If clickable, the component must be reachable via `Tab` and activatable via `Enter`/`Space`.
- **Label**: Provide accessible naming (default `aria-label`, overridable via prop).
- **Decorative mode**: Support `aria-hidden` (or `decorative` prop) when the logo is purely decorative.
- **Contrast**: Active glow should be visible against dark and mid-tone backgrounds; idle should remain subtle (not a contrast requirement, but must be visually distinct).

### 7) API (public props)
Minimum required props:
- `corner`: `'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'` (default: `'bottom-right'`)
- `size`: `number` (px) (default: `48`)
- `inset`: `number` (px) or `{ x: number; y: number }` (default: `16`)
- `className`: `string` (optional)
- `style`: `React.CSSProperties` (optional)
- `onClick`: `(event) => void` (optional)
- `href`: `string` (optional; if provided, renders as `<a>` semantics)
- `ariaLabel`: `string` (optional; default provided)
- `decorative`: `boolean` (optional; default `false`)

Optional “design-tuning” props (nice-to-have, can be deferred if needed):
- `idleOpacity`: `number` (default: ~`0.25`)
- `activeIntensity`: `number` (default: `1`)

## Data Requirements (optional)
None. This is a purely presentational component with transient interaction state only.

## User Flow
1. User loads a screen that includes the corner logo.
2. User notices a faint Dumbo Octopus silhouette in the corner (idle state).
3. User moves pointer over the logo (or tabs to it if interactive).
4. **NEW:** The logo “powers up” with cyan bioluminescent bloom (active state).
5. User moves pointer away (or focus leaves) and the logo returns to idle state.
6. If the logo is clickable, user can activate it to trigger the provided action (e.g., open About, return Home).

## Acceptance Criteria
- **Single file**:
  - ✅ The feature is delivered as exactly one React component file that includes its own styling.
  - ✅ No external assets are used (no imported images/SVG files).
  - ✅ No required modifications to global CSS are necessary.
- **Shape**:
  - ✅ The rendered logo reads as a simplified Dumbo Octopus silhouette with ear fins, bell mantle, and webbed tentacles.
- **Idle state**:
  - ✅ Default rendering is faint ghostly white at low opacity and does not visually dominate the UI.
- **Active state**:
  - ✅ On hover/focus (and optionally press), the logo exhibits a multi-layer cyan neon bloom (“gas” effect) created via stacked shadows/filters.
  - ✅ Transitions complete in 120–250ms (or ≤80ms in reduced motion).
- **Positioning**:
  - ✅ By default, the logo sits fixed in the bottom-right corner with a 16px inset.
  - ✅ The `corner` prop correctly positions the logo in all four corners.
- **Accessibility**:
  - ✅ If `onClick`/`href` is provided, the logo is keyboard-focusable and activatable and has an accessible name.
  - ✅ If `decorative` is true, the logo is hidden from assistive tech (no redundant announcement).

## Edge Cases
- **No hover environments (touch devices)**:
  - Active state should be reachable via press feedback (optional) or remain acceptably idle-only; must not look broken.
- **Very light or very dark backgrounds**:
  - Idle state should still be perceivable (subtle), and active bloom should still be clearly visible.
- **Large sizes (128–256px)**:
  - Glow must not clip; filter/shadow region must account for bloom radius.
- **Reduced motion**:
  - Must not animate in a way that violates reduced motion expectations.
- **Pointer capture / drag**:
  - If the host app uses drag interactions, the logo should not interfere with drag gestures outside its small hitbox.
- **SSR / hydration** (if used in Next.js):
  - The component must not rely on browser-only APIs at render time (no `window` reads required for basic rendering).

## Non-Functional Requirements (optional)
- **Performance**:
  - Avoid continuous JS animation loops.
  - Prefer CSS transitions and SVG filters that are lightweight at small sizes.
- **Compatibility**:
  - Must render correctly in modern Chrome, Firefox, Safari, and Edge.
- **Maintainability**:
  - Keep SVG paths readable (grouped/labeled) and props documented in code comments.

## Technical Notes (implementation guidance)
- Implement as an inline SVG inside a fixed-position wrapper.
- Achieve the “gas” glow by stacking multiple `drop-shadow()` layers (CSS filter) and/or an SVG `<filter>` with blur + color.
- Use `:hover`, `:focus-visible`, and `:active` (plus `prefers-reduced-motion`) to control intensity without React state unless needed for press-on-touch.
- If `href` is provided, render an anchor with appropriate `rel` handling; otherwise render a `button` when clickable.

## Dependencies
- No new dependencies required. Must work in a plain React project.

## Future Enhancements (Out of Scope)
- Multi-state “charge up” animation sequence (pulsing, flicker, ripple).
- User-configurable corner/logo visibility toggle stored in settings.
- Theme-aware palette variants (e.g., green/amber bioluminescence modes).


