A Deep-Work Visual OS App (Grimpo)
A cognitive exoskeleton that merges Notion-style docs with Miro-style mapping. It is a Next.js spatial workspace where strategy and execution drift as bioluminescent, rich-text nodes in a deep-sea abyss. Designed for deep thinkers and designers, it replaces rigid lists with organic proximity clustering and fluid state transitions inspired by the Dumbo Octopus. Built with React Flow, Tiptap, Superbase, Vercel, and Framer Motion.


# GRIMPO LITE: The 5-Hour MVP Plan (Updated)

## 🚨 PROJECT CONSTRAINTS & CONTEXT
*   **Time Limit:** 5 Hours (Strict).
*   **Developer Level:** Beginner / Vibe Coding.
*   **Goal:** Visual "Juice" + Strategy/Execution flow.
*   **Database:** NONE. Use `localStorage` only.
*   **Authentication:** NONE.

## 🌊 THE CONCEPT
A "Cognitive Exoskeleton" for INTJs. A deep-sea spatial workspace where tasks are bioluminescent organisms.
*   **Vibe:** Dark, moody, underwater, efficient.
*   **Metaphor:** The Dumbo Octopus.
*   **Key Interaction:** "Swallowing" tasks (imploding) & Semantic Zoom (Focus).

---

## 🛠 TECH STACK
*   **Framework:** Next.js (App Router).
*   **Styling:** Tailwind CSS.
*   **Canvas Engine:** React Flow.
*   **Icons:** Lucide React.
*   **Animation:** CSS Transitions.

---

## 🧠 MENTAL MODEL (CAVEMAN & ELI5)

### 1. The Environment: "The Abyss"
*   **CAVEMAN TL;DR:** Big dark screen. Infinite space. No edges.
*   **ELI5:** Imagine a giant, never-ending piece of dark blue paper. You can slide it around and zoom in and out. This is where your octopus lives.
*   **The Tech:** React Flow (Background: Dark Navy Gradient).

### 2. The Creature: "Glass Nodes"
*   **CAVEMAN TL;DR:** See-through box. Glows blue.
*   **ELI5:** Special cards made of "frosted glass." They look like they are floating underwater.
*   **The Tech:** Custom Node + Tailwind (`backdrop-blur`).

### 3. The Lens: "Semantic Zoom" (NEW)
*   **CAVEMAN TL;DR:** Zoom out = Big words only. Zoom in = Read everything.
*   **ELI5:** When you fly high up in the sky, you only see the names of cities (Strategy). When you land on the ground, you can read the street signs (Execution). This keeps the map clean.
*   **The Tech:** React Flow `useViewport` hook. If `zoom < 1`, CSS hides the `<textarea>`.

### 4. The Action: "Swallowing"
*   **CAVEMAN TL;DR:** Task done? Click button. Box go poof.
*   **ELI5:** When you finish a task, you click a button and the card shrinks until it vanishes, like an octopus eating a snack.
*   **The Tech:** CSS Animation (Scale 1 -> 0) + Delete function.

### 5. The Web: "Glowing Lines"
*   **CAVEMAN TL;DR:** Draw line between boxes. Line moves.
*   **ELI5:** You tie two cards together with a glowing string. It wiggles so it looks alive.
*   **The Tech:** React Flow Edges (Animated = true).

### 6. The Memory: "Local Save"
*   **CAVEMAN TL;DR:** Close tab. Open tab. Stuff still there.
*   **ELI5:** Your browser remembers the picture. No internet needed.
*   **The Tech:** Browser LocalStorage.

---

## 🎨 DESIGN SYSTEM (THE PARETO PRINCIPLE)
1.  **Background:** `bg-gradient-to-b from-slate-900 to-black`.
2.  **Node Glass:** `bg-slate-900/60 backdrop-blur-md border border-cyan-400/30`.
3.  **Zoom Logic:**
    *   *Zoomed Out:* Title Font Size = Large (`text-2xl`), Body = Hidden (`opacity-0`).
    *   *Zoomed In:* Title Font Size = Normal (`text-lg`), Body = Visible (`opacity-100`).

---

## 🗺 DEVELOPMENT PHASES (PROMPTING GUIDE)

### Phase 1: The Setup
*   Initialize Next.js + Tailwind + React Flow.
*   Render full-screen Dark Gradient canvas.

### Phase 2: The Creature & The Lens
*   Create `BiolumNode.tsx`.
*   **Implement Zoom Logic:** Pass the current zoom level to the node. If zoom is low, hide the description text and make the title bold.
*   Add `<input>` (Title) and `<textarea>` (Notes).

### Phase 3: The Interaction
*   Add "Add Node" FAB.
*   Add "Swallow" button logic (CSS Scale Down).

### Phase 4: Persistence
*   Save/Load to `localStorage`.