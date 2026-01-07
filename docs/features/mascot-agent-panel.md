# Feature Requirement Document (FRED): MascotAgentPanel

## Feature Name
MascotAgentPanel

## Goal
Replace the existing bottom-right mascot widget with a new, highly interactive `MascotAgentPanel` component. This component provides a "Periscope" style vertical slide-up menu for each of the three mascot agents (Dumbo, Dumby, Grimpy), allowing users to quickly trigger specific AI-driven actions and animations.

## User Story
As a user, I want to click on a mascot in the box and see a vertical menu of quick actions, so that I can interact with the AI agents (Intern, Manager, Architect) without having to open the full chat interface.

## Functional Requirements

### 1. Layout & Interaction (The Periscopes)
- **Component**: Create a new `MascotAgentPanel` component.
- **Movability**: The entire `MascotAgentPanel` must retain the "draggable" feature using `motion.div` from Framer Motion, with `dragConstraints` (e.g., using `wrapperRef`) to prevent it from leaving the viewport, consistent with the previous mascot widget's behavior.
- **Mascots**: Display the three mascots (Dumbo, Dumby, Grimpy) in a horizontal row at the base.
- **Periscope Menu**:
    - Clicking a mascot toggles its specific vertical menu.
    - Only one mascot's menu should be open at a time (optional, but recommended for clean UI).
    - Menus slide **UP** from the mascot's position.
    - Use `AnimatePresence` and `motion` from Framer Motion for the slide-up/down transition.
- **Compact Design**: Menu width should be constrained to 40-48px.

### 2. AI & System Integration
Inside the `handleToolClick` function (or equivalent), the following actions must be bridged:

- **Dumbo (Intern) -> `triggerDance`**:
    - Dispatches a custom event: `window.dispatchEvent(new CustomEvent('mascot-dance'))`.
- **Dumby (Manager) -> `ingestResources`**:
    - Opens the "Resource Chamber" sidebar (using existing `setResourceChamberOpen` or similar state).
- **Grimpy (Architect) -> `generateStrategy`**:
    - Calls the Vercel AI SDK `append()` function (requires `useChat` hook integration).
    - Appends a system message: `"User requests a strategic plan. Please generate nodes."`

### 3. Visual Constraints
- **Style**: Use the "Abyss" glassmorphism theme.
    - `backdrop-blur-xl`.
    - Translucent background consistent with existing UI (e.g., `bg-slate-950/40`).
    - Border styling consistent with the "Abyss" theme (e.g., `border-cyan-300/15`).
- **Z-Index**:
    - `MascotAgentPanel` and its menus: `z-[50+]`.
    - **Layering Order (Lowest to Highest)**:
        1. Chat Toggle Button (existing).
        2. Resource Chamber Sidebar.
        3. `MascotAgentPanel` and its menus.
    - *Note*: Ensure the menus slide up **over** the React Flow canvas nodes.

## Data Requirements
- No new database tables are required.
- Integration with the `useChat` hook state (or a shared context if necessary) for the `append()` function.

## User Flow
1. User hovers/clicks a mascot in the bottom-right widget.
2. A vertical menu slides up from the mascot.
3. User clicks an action button (e.g., "Dance", "Resources", "Strategy").
4. The system executes the corresponding logic (Event, Sidebar, or AI Call).
5. The menu can be closed by clicking the mascot again or clicking outside (suggested).

## Acceptance Criteria
- [ ] `MascotAgentPanel` correctly replaces the old mascot widget in `app/page.tsx`.
- [ ] The `MascotAgentPanel` is draggable across the screen, consistent with the previous mascot widget's behavior.
- [ ] Clicking each mascot triggers a smooth Framer Motion slide-up animation for its menu.
- [ ] Dumbo's "Dance" button dispatches the `mascot-dance` event.
- [ ] Dumby's "Resources" button opens the Resource Chamber.
- [ ] Grimpy's "Strategy" button triggers an AI SDK `append` call with the specified prompt.
- [ ] Z-index layering matches the visual requirements (menus above nodes, but below/above other UI elements as specified).
- [ ] Menus are compact (40-48px width) and follow "Abyss" styling.

## Edge Cases
- **Mobile View**: Ensure the menus don't overlap with other mobile-specific UI or become too small.
- **Concurrent Menus**: Decide if multiple menus can be open or if clicking one closes others.
- **AI SDK Connectivity**: Handle cases where `append` might fail if the chat is not initialized.

