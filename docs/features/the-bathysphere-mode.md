# Feature Requirement Document: Immersive Reading Views (Bathysphere & Sonar Array)

## Goal
The problem these features solve is the visual clutter and difficulty of cross-referencing information when performing deep work on a canvas. 
- **The Bathysphere Mode** provides an immersive, full-screen focus view for a single PDF.
- **The Sonar Array** provides a multi-PDF comparison view for cross-referencing data across several documents simultaneously.

---

## 1. The Bathysphere Mode (Focus View)

### Goal
Simulate a submarine's observation portal where the rest of the world (the app UI) fades away, allowing for total immersion in a single document.

### User Story
As a deep-sea explorer (user), I want to "submerge" into a document by clicking a maximize button, so that the canvas UI disappears and I can focus entirely on the PDF as if it were a glowing tablet in the abyss.

### Functional Requirements
1.  **Bathysphere Trigger**: A "Maximize" button (using the `Maximize2` icon from Lucide) in the header of the PDF/Media node.
2.  **Immersive Transition**: PDF card expands from its position to fill the screen using Framer Motion layout animations.
3.  **Focus Overlay**: Full-screen overlay (`fixed inset-0 z-[100]`) with a dark, blurred background (`bg-slate-950/95 backdrop-blur-xl`). Background dims slowly (CSS transition `duration-700`).
4.  **The "Glow" Effect**: PDF document has a subtle outer glow (`shadow-[0_0_50px_rgba(255,255,255,0.1)]`) to simulate a submarine reading light.
5.  **Persistent Sidebar**: The "Dumby Chat" sidebar remains visible and functional on the right side.
6.  **Canvas Isolation**: All other canvas UI elements (mascots, toolbar, other nodes) are hidden or obscured.
7.  **Exit Mechanism**: A "Minimize" button (`Minimize2` icon) returns to the standard canvas view.

### Acceptance Criteria
*   [ ] "Maximize" button appears on PDF nodes.
*   [ ] Smooth transition using Framer Motion (Expand & Immerse).
*   [ ] Full-screen mode uses fixed overlay with `z-index: 100`.
*   [ ] Background is `slate-950/95` with `blur-xl`.
*   [ ] "Submarine light" glow effect is visible on the PDF.
*   [ ] Dumby Chat sidebar is docked on the right.

---

## 2. The Sonar Array (Multi-PDF Comparison)

### Goal
In the "Deep Sea" metaphor, this is the "Command Bridge" where you pull up multiple screens to cross-reference data and detect patterns across documents.

### User Story
As a deep-sea analyst, I want to select multiple PDFs and view them side-by-side in a grid, so that I can compare their contents and use a single AI agent to analyze differences between them.

### Functional Requirements
1.  **The Trigger (Selection Logic)**:
    *   Hold **Shift** and click multiple PDF Nodes on the canvas (React Flow multi-select).
    *   A **FloatingControlBar** component appears at the bottom-center when 2+ media/pdf nodes are selected.
    *   Button: "Compare Documents" (Icon: `Columns` or `SplitSquare`).
2.  **The Grid Layout**:
    *   Full-screen overlay (`fixed inset-0 z-50 bg-slate-950`).
    *   Dynamic CSS Grid based on selection:
        *   2 Docs: `grid-cols-2`.
        *   3 Docs: `grid-cols-3`.
        *   4 Docs: `grid-cols-2 grid-rows-2`.
3.  **The Shared Sidebar**:
    *   A single, shared "Dumby Chat" pane on the far right (300px width).
    *   Displays badges at the top indicating which documents are currently loaded.
4.  **Shared Intelligence**:
    *   Highlighting text in *any* open PDF sends that context to the shared chat.
    *   Allows cross-document queries like "What is the difference between these two definitions?"
5.  **Sync Scroll**:
    *   A "Sync Scroll" toggle button at the top.
    *   When enabled, scrolling one PDF scrolls all others by percentage.
6.  **Visuals**:
    *   Thin Cyan separator lines between grid columns.
    *   Main area fades to black behind the documents.

### Advanced "Juice" (Dumby's Role)
*   **"Dumby Compare" Button**: A button in the shared chat that, when clicked, triggers the AI to read the first page of all open PDFs and generate a structured comparison table (e.g., "Methodology", "Results", "Conclusion").

### Acceptance Criteria
*   [ ] Floating Action Bar appears correctly on multi-select.
*   [ ] "Sonar Array" view mounts as a full-screen overlay.
*   [ ] Grid layout adapts to 2, 3, or 4 documents.
*   [ ] Individual `DumbyReader` instances hide their own sidebars in "compact" mode.
*   [ ] Shared chat receives highlights from multiple documents.
*   [ ] Sync scroll functionality works across all visible PDF instances.

---

## Data & Technical Requirements (Shared)
*   **Mode State**: `DumbyReader` component needs `viewMode` ("inline", "bathysphere", "compact").
*   **State Management**: `MediaNode` manages local `isFullScreen`. A global `SonarArray` component manages the multi-doc list.
*   **Performance**: Handle multiple PDF.js instances simultaneously without crashing the browser.
*   **Edge Cases**: Handle window resizing and document load failures gracefully in grid view.
