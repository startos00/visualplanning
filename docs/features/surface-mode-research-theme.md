# Feature Requirement Document (FRED): Surface Mode (Research-First Light Theme)

## Feature Name
Surface Mode (Research-First Light Theme)

## Goal
Create a psychologically distinct “Surface Mode” that feels like a **clean research lab / sketchbook**, optimized for **reading PDFs, highlighting, and divergent brainstorming** with low eye strain. This mode should be a deliberate contrast to Abyss Mode’s high-pressure deep-work environment.

## User Story
As a researcher/thinker, I want to switch to a bright, crisp “Surface Mode” that looks like graph paper and physical index cards so that I can read, annotate, and explore ideas broadly without the visual fatigue and “laser/glow” intensity of Dark Mode.

## Functional Requirements

### 1) Theme Concept: “From Neon to Ink”
- **Abyss Mode (Dark)**: light/glow defines shapes (neon, bloom, lasers).
- **Surface Mode (Light)**: shadows + ink define shapes (paper, pencil, card edges).

### 2) Theme Switch & Global Tokens (Tailwind / CSS Variables)
- **Theme state**: The app supports two themes:
  - **Abyss Mode** (Dark): “Submarine” metaphor (high pressure, narrow focus, execution).
  - **Surface Mode** (Light): “Laboratory / Desk” metaphor (bright, expansive, research-first).
- **Theme selector**: Theme can be derived from `data-theme='light'` (or `class='light'`) for light mode detection.
- **Global colors when Light Mode is active** (via `globals.css`):
  - **Background**: `#f8fafc` (Slate-50 / paper white; not pure `#ffffff`)
  - **Text**: `#0f172a` (Slate-900 / ink)
  - **Text selection**: highlighter yellow `#fef08a` (replaces cyan selection)

### 3) Canvas (React Flow): “The Graph Paper”
- When in **Surface Mode**:
  - React Flow `<Background />` uses **Lines** (not Dots).
  - Grid line color is **very faint grey** `#e2e8f0`.
- Rationale: lined graph paper supports divergent diagramming and connection-finding without visual noise.

### 4) Nodes: “Index Cards” (Surface Mode styling)
- When in **Surface Mode**, nodes render as physical index cards (as opposed to “glass”).
- Node container styling:
  - **Container**: `bg-white/90 backdrop-blur-sm shadow-md border border-slate-200`
  - **Text**: `text-slate-800`
  - **Headers**: `font-bold text-slate-900`
- Connection handles:
  - Replace “glowing dots” with **solid grey circles**: `bg-slate-400`
- Note: If a node component is currently named differently (e.g., `GlassNode`), Surface Mode should still apply the “Index Card” treatment to the primary node UI.

### 5) Edges: “Pencil Sketch” Connections
- When in **Surface Mode**, default edge style becomes a pencil/ink line (not a laser):
  - **Color**: `#94a3b8` (Slate-400)
  - **Animation**: Off (or extremely subtle/slow)
  - **Stroke**: `strokeWidth: 1.5`

### 6) Mascots: Daylight Adaptation
In Surface Mode, “glowing ghosts” must translate to daylight-friendly, high-contrast illustrations.

- **Dumbo**:
  - Fill becomes darker yellow: `fill-yellow-400`
  - Add outline: `stroke-slate-900` (cartoon style)
- **Dumby**:
  - Fill becomes: `fill-orange-500`
  - Add outline: `stroke-slate-900`
- **Grimpy**:
  - Transform from “Ghost” vibe to “Blueprint” vibe:
    - Fill: transparent
    - Stroke: `stroke-cyan-700`
    - Dash: `stroke-dasharray: 4 2` (architectural dashed lines)

### 7) Surface-Only Layout Tool: “Scatter Desk” (Optional, but recommended)
- **Availability**: A tool button labeled **“Scatter”** appears on Dumby **only in Surface Mode**.
- **Action**: When clicked, take all **currently selected nodes** and slightly randomize their positions (push them apart).
- **Intent**: Encourage divergent thinking and rapid idea reshuffling (“shuffling papers on a desk”).

## Data Requirements (Optional)
- **Theme persistence**: Store the user’s last selected theme (e.g., local storage or user profile) so the mode is consistent across sessions.
- **Scatter settings** (optional): configurable scatter “strength” or seed value (can be deferred).

## User Flow
1. User enters the app in Abyss Mode (deep work) or Surface Mode (research), depending on their last selection.
2. User switches to **Surface Mode** to read PDFs, highlight passages, and brainstorm across multiple ideas.
3. The canvas background becomes **lined graph paper** and nodes become **index cards**.
4. Connections render as **pencil lines**, improving readability against paper white.
5. Mascots render in **daylight-friendly** variants to maintain character identity without glow artifacts.
6. (Optional) User selects a cluster of nodes and clicks **Scatter** to loosen rigid layout and explore alternate arrangements.

## Acceptance Criteria
- [ ] When theme is Light/Surface, global background is `#f8fafc` and text is `#0f172a`.
- [ ] In Light/Surface, text selection uses `#fef08a`.
- [ ] In Light/Surface, React Flow background uses Lines with `#e2e8f0`.
- [ ] In Light/Surface, primary node UI looks like an index card (white card, border, shadow, ink text).
- [ ] In Light/Surface, node handles are solid grey circles (no glow).
- [ ] In Light/Surface, edges are Slate-400 pencil lines with `strokeWidth` 1.5 and are non-animated (or very subtle).
- [ ] In Light/Surface, Dumbo/Dumby have high-contrast outlines, and Grimpy renders as a blueprint-style dashed cyan drawing.
- [ ] (Optional) “Scatter” button appears only in Light/Surface and moves only selected nodes in a stable, non-destructive way.

## Edge Cases
- **Theme detection mismatch**: If both `data-theme` and `class` exist, define a single source of truth (documented).
- **No selected nodes (Scatter)**: Clicking Scatter does nothing and provides a subtle hint (or silently no-ops).
- **Single selected node (Scatter)**: Apply a minimal nudge (or no-op).
- **Overlapping after scatter**: Ensure scatter pushes nodes apart enough to reduce overlap (within reason).
- **Zoom/viewport**: Scatter should move nodes in canvas coordinates without changing the viewport unexpectedly.
- **High-density graphs**: Pencil edges remain legible; avoid overly dark grids or heavy shadows that create visual clutter.

## Non-Functional Requirements (Optional)
- **Readability & eye strain**: Light theme must remain comfortable for long reading sessions (avoid pure white, avoid high-saturation glows).
- **Accessibility**: Maintain sufficient contrast on text, outlines, and handles.
- **Performance**: Theme switching should not introduce noticeable jank; edge/node styling should remain performant for large graphs.

## Comparison Table (Mental Model)
| Element | Abyss Mode (Dark) | Surface Mode (Light) |
|---|---|---|
| Use Case | Deep Work, Coding, Execution | Research, Reading, Brainstorming |
| Metaphor | The Submarine | The Library / Lab |
| Nodes | Floating Glass | Physical Index Cards |
| Lines | Lasers / Fiber Optics | Pencil / Ink Lines |
| Background | Infinite Void | Graph Paper |
| Text | Glowing Neon | Sharp Ink |
| Mascot | Bioluminescent Entity | Blueprint / Sketch |



