# Feature Requirement Document: Creation Dock

## Feature Name: Creation Dock
**Goal**: Replace the existing "Add Node" button in `app/project/[id]/page.tsx` with a new `CreationDock` component that centralizes node creation and drawing mode toggling, improving discoverability and muscle memory.

## User Story
As a user, I want a single, consistent place to create content (nodes) and enter drawing mode, so that I can easily switch between structured planning and freeform sketching.

## Functional Requirements
1. **Replacement**: Remove the existing "Add Node" logic and button from `app/project/[id]/page.tsx`.
2. **CreationDock Component**:
    - Fixed position at `bottom-6 right-24` (to the left of the Mascot Panel).
    - **Main "+" Button**: Expands/collapses a vertical menu of creation options.
    - **Sketch Button**: Toggles `isDrawingMode` state.
    - **Media Button**: Spawns a 'media' (resource) node by calling `handleAddNode('media')`.
    - **Note Button**: Spawns a 'text' (tactical) node by calling `handleAddNode('text')`.
3. **Drawing Mode Interaction**:
    - When `isDrawingMode` is **TRUE**:
        - Hide the "+" button and the expanded menu.
        - Show a prominent "DONE DRAWING" button (Cyan Pill).
        - Clicking "DONE DRAWING" saves the current drawing and sets `isDrawingMode` back to `FALSE`.
4. **State & Logic Integration**:
    - Integrate with `isDrawingMode` state (provided by drawing logic).
    - Implement/Utilize `handleAddNode(type: string)` for spawning nodes.

## Data Requirements
- None. This feature utilizes existing node creation and drawing state logic.

## User Flow
1. **Open Dock**: User clicks the "+" button in the bottom-right (Creation Dock).
2. **Expand Menu**: The menu expands vertically showing Sketch, Media, and Note options.
3. **Start Drawing**: User clicks "Sketch".
    - `isDrawingMode` becomes `true`.
    - The dock UI transforms into a "DONE DRAWING" button.
4. **Finish Drawing**: User finishes their sketch and clicks "DONE DRAWING".
    - The sketch is saved.
    - `isDrawingMode` becomes `false`.
    - UI returns to the standard "+" button dock.
5. **Create Content**:
    - User clicks "Note" -> A new text (tactical) node is spawned.
    - User clicks "Media" -> A new media (resource) node is spawned.

## Acceptance Criteria
- The old "Add Node" button is completely removed.
- The `CreationDock` component is correctly positioned at `bottom-6 right-24`.
- The menu correctly expands and collapses with smooth animations.
- The "DONE DRAWING" button correctly appears and disappears based on `isDrawingMode`.
- Spawning nodes via "Media" and "Note" buttons works as expected.
- Drawing mode is correctly toggled and saved.

## Edge Cases
- **UI Collisions**: Ensure the expanded dock does not overlap or conflict with the Mascot Panel or other floating UI elements.
- **State Sync**: Ensure the "DONE DRAWING" state correctly reflects the global `isDrawingMode`.
- **Theme Consistency**: The dock should adapt its styling (colors, shadows, blurs) based on "Abyss" and "Surface" themes.

## Non-Functional Requirements
- **Animations**: Use `framer-motion` for fluid transitions between states (collapsed/expanded, normal/drawing mode).
- **UX**: High discoverability for the drawing feature by placing it in the primary creation hub.
- **Performance**: Ensure toggling states doesn't cause unnecessary re-renders of the entire React Flow canvas.

