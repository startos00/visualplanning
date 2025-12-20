# Role-Based Template Spawner (Thinking Patterns)

## Goal
Help users overcome blank-canvas syndrome by generating small, pre-structured node layouts with role-tailored prompts. Users can also explicitly choose **Blank canvas** to continue without spawning anything.

## User Story
As a user (designer, scientist, founder, engineer, or generalist), I want to spawn a pre-structured thinking pattern into the canvas (or choose a blank start) so that I can start working immediately in the way that suits me.

## Functional Requirements

### UI: Top-Center Floating Pill
- **Placement**: A floating pill container at the **top-center** of the screen (overlaying the canvas).
- **Controls**:
  - **Role Selector** dropdown:
    - Options: **General**, **Designer/Architect**, **Scientist/Academic**, **Founder**, **Engineer**
    - Stored in state variable `currentRole` (default: `General`)
  - **Spawn Pattern** control (dropdown or button group):
    - Options: **Divergent (Explorer)**, **Convergent (Builder)**, **Blank canvas**
    - Selecting Divergent/Convergent triggers spawning.
    - Selecting **Blank canvas** performs **no-op** (no nodes/edges added or removed).

### Role Content Dictionary (Label Mapping)
When a pattern is triggered, node labels are chosen based on `currentRole`:

- **General**
  - Divergent: Center = "Main Topic"; Outer = ["Idea 1", "Idea 2", "Idea 3", "Idea 4"]
  - Convergent: ["Step 1", "Step 2", "Step 3"]
- **Designer / Architect**
  - Divergent: Center = "Concept Theme"; Outer = ["Color", "Texture", "Form", "Vibe"]
  - Convergent: ["Sketch", "Wireframe", "Prototype"]
- **Scientist / Academic**
  - Divergent: Center = "Research Question"; Outer = ["Variables", "Context", "Literature", "Methods"]
  - Convergent: ["Hypothesis", "Experiment", "Conclusion"]
- **Founder / Business**
  - Divergent: Center = "Value Prop"; Outer = ["Customer", "Problem", "Solution", "Market"]
  - Convergent: ["Build", "Measure", "Learn"]
- **Engineer**
  - Divergent: Center = "System Arch"; Outer = ["Frontend", "Backend", "Database", "DevOps"]
  - Convergent: ["Spec", "Implement", "Test"]

### Spatial Logic (Hardcoded Coordinates)
Do not use a layout library. Use the following relative coordinates.

#### A. Divergent Pattern (Radial/Star)
- **Nodes**: 1 Center + 4 Surrounding
- **Coordinates**:
  - Center: { x: 0, y: 0 }
  - Outer 1 (Top): { x: 0, y: -200 }
  - Outer 2 (Right): { x: 200, y: 0 }
  - Outer 3 (Bottom): { x: 0, y: 200 }
  - Outer 4 (Left): { x: -200, y: 0 }
- **Edges**: Center → each Outer node

#### B. Convergent Pattern (Linear/Stack)
- **Nodes**: 3 stacked vertically
- **Coordinates**:
  - Node 1: { x: 0, y: -150 }
  - Node 2: { x: 0, y: 0 }
  - Node 3: { x: 0, y: 150 }
- **Edges**: Node 1 → Node 2 → Node 3

### Implementation Requirements
- **Unique IDs**: Every new node must have a unique generated ID (e.g. `role-pattern-${timestamp}-${index}`) to allow multiple spawns without conflicts.
- **Append-only**: Spawning must **append** nodes/edges; do not delete or replace existing graph state.
- **Anchor**: Relative coordinates are anchored at the **current viewport center** (screen center converted to flow coordinates).
- **Node types**:
  - Divergent spawns `strategy` nodes
  - Convergent spawns `tactical` nodes

## Data Requirements (Optional)
- No new tables or backend storage.
- Spawned nodes/edges persist via the existing local graph persistence (localStorage).
- The `currentRole` UI state is not persisted unless explicitly requested later.

## User Flow
1. User opens the canvas.
2. User selects a Role in the top-center pill (default: General).
3. User chooses a Spawn Pattern option:
   - Divergent (Explorer) → template spawns
   - Convergent (Builder) → template spawns
   - Blank canvas → nothing spawns; user proceeds manually
4. User edits node titles/notes and continues.

## Acceptance Criteria
- The top-center pill is visible, readable, and interactive over the canvas.
- Selecting any role + Divergent/Convergent spawns nodes with the exact specified labels.
- Divergent spawns 5 nodes and 4 edges.
- Convergent spawns 3 nodes and 2 edges.
- Spawned nodes are centered around the current viewport center.
- Multiple spawns do not cause ID collisions and do not overwrite existing nodes.
- Selecting **Blank canvas** does not add/remove nodes or edges.

## Edge Cases
- Spawning multiple times rapidly still results in unique IDs.
- Spawning while zoomed/panned anchors to the visible viewport center.
- If React Flow’s `screenToFlowPosition` is not available (early init), anchor to { x: 0, y: 0 }.

## Non-Functional Requirements (Optional)
- No layout libraries; hardcoded coordinates only.
- Keep UI consistent with existing overlay styling (pill, blur, subtle borders).


