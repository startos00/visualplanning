# Feature Requirement Document: The Sonar Overlay

## Feature Name
The Sonar Overlay (Cross-Canvas Trace Reference)

## Goal
To allow users to view another project's canvas as a holographic, non-interactive overlay on top of their current project. This facilitates cross-project alignment and reference without needing to switch contexts or manually copy data.

## User Story
As a user working on a complex multi-stage project, I want to overlay a "holographic projection" of a related project (e.g., "Market Research" over "Q1 Goals") so that I can align my current thoughts and tasks against the previous work without cluttering my active canvas.

## Functional Requirements
- **Trigger**: A "Sonar" button/dropdown in the Top Right UI (near Layer Manager/Floating Control Bar).
- **Project Selection**: A dropdown menu listing all other projects owned by the user.
- **Data Fetching**: When a project is selected, fetch its nodes and edges via a server action.
- **Trace Injection**: 
    - Inject the fetched nodes into the current React Flow state.
    - Append `(Trace)` or a similar suffix to the IDs to avoid conflicts.
    - Mark nodes with `data.isTrace = true`.
- **Holographic Behavior**:
    - **Draggable**: `false`.
    - **Selectable**: `false`.
    - **Z-Index**: `-1` (behind active nodes).
    - **Pointer Events**: `none` (clicks pass through to active canvas).
- **Visual Styling**:
    - Wireframe look: Stripped of color, dashed borders (Cyan-500/20).
    - Reduced Content: Show only Header/Title; hide body text/images.
    - Global Fade-in: Nodes fade in slowly (e.g., 1000ms transition).
- **Coordinate Alignment**: Nodes must appear at the exact same X/Y coordinates they occupy in their source project.
- **Cleanup**: Deselecting the trace removes all nodes with `data.isTrace === true`.
- **Trace Shift (Optional/Extra)**: Controls to manually shift the overlay (Up/Down/Left/Right) in 50px increments.

## Data Requirements
- No new database tables.
- Reuses existing `projects` table and `getProjectData` server action.
- Nodes in state will temporarily hold `isTrace: boolean` in their `data` object.

## User Flow
1. User clicks the "Sonar" button in the Top Right.
2. User selects "Market Research" from the dropdown.
3. The "Market Research" project's nodes appear as cyan wireframes behind the current nodes.
4. User uses the overlay to align their current "Q1 Goals" nodes.
5. User clicks "Clear Sonar" or selects "None" to remove the overlay.

## Acceptance Criteria
- [ ] Sonar dropdown lists all other projects for the user.
- [ ] Selecting a project renders its nodes as non-interactive ghost nodes.
- [ ] Ghost nodes are visually distinct (wireframe, cyan, title-only).
- [ ] Clicking on or through a ghost node interacts with the active canvas behind/above it.
- [ ] Clearing the sonar selection removes all ghost nodes instantly.
- [ ] (Optional) Shift tools move the entire ghost node set correctly.

## Edge Cases
- **Self-reference**: The current project should not be selectable in the Sonar dropdown.
- **Node ID conflicts**: Ensure unique ID generation for trace nodes.
- **Performance**: Large projects as traces should not cause significant lag (mitigated by simplified rendering).
- **Empty Projects**: Selecting an empty project should show nothing but clear the previous trace.

## Non-Functional Requirements
- **UX**: Smooth fade-in transition for the holographic effect.
- **Performance**: Stripping content ensures React Flow handles the extra nodes efficiently.

