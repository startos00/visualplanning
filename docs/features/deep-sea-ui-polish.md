# Feature Requirement Document (FRED): Deep Sea UI Theme Polish

## Feature Name
Deep Sea UI Theme Polish (Custom Components)

## Goal
Replace default browser/OS UI elements (specifically dropdown menus) with custom, themed components that match the bioluminescent "Abyss" aesthetic. This ensures a consistent, immersive experience across the entire application, moving away from "web-standard" looks towards a bespoke "Abyssal" UI.

## User Story
As a user of the Visual Planning tool, I want every UI interaction—including dropdowns and menus—to feel like it belongs in the deep-sea environment, so that my focus and immersion are never broken by generic operating system styling.

## Functional Requirements

### 1) Custom "Abyssal" UI Components
- **Dropdown Component**: Replace native `<select>` with a custom implementation.
  - Background: `bg-slate-950/60` with `backdrop-blur-md`.
  - Border: `border-cyan-500/30`.
  - Text: `text-cyan-50`.
  - Selection: Highlight active/hovered items with `bg-cyan-500/20` and a subtle cyan glow.
- **Checkbox Component**: Replace native `<input type="checkbox">`.
  - Custom square/circle with a cyan bioluminescent check/fill.
- **Date Picker Component**: Replace or theme the native `<input type="date">`.
  - Ensure it follows the deep-sea color palette.
- **Scrollbars**: Implement custom thin, cyan-tinted scrollbars for overflow areas.

### 2) Integration in Components
- **TemplateSpawner**: Replace native `<select>` elements for "ROLE" and "SPAWN PATTERN".
- **GlassNode**:
  - Replace native checkbox for "Done" status.
  - Theme/Replace the date input for deadlines.
  - Ensure all text inputs and textareas have the consistent "Abyssal" focus states.
- **AbyssalGardenPanel**:
  - Apply custom scrollbars to Shop and Inventory lists.

## User Flow
1. User interacts with the "ROLE" or "SPAWN PATTERN" area at the top of the screen.
2. Instead of a native OS menu, a themed "Abyssal" menu slides/fades into view.
3. User hovers over options, which light up with a cyan glow.
4. User selects an option; the menu closes smoothly, and the action is triggered.

## Acceptance Criteria
- [ ] Dropdowns in `TemplateSpawner` are fully custom and themed.
- [ ] No native browser dropdown styling is visible during normal use.
- [ ] Dropdowns are fully keyboard-accessible.
- [ ] Transitions between menu states are smooth (100-200ms).
- [ ] Color palette strictly follows the established Cyan/Slate/Rose Abyss theme.

## Edge Cases
- **Menu Clipping**: Ensure the custom dropdown renders on top of the ReactFlow canvas and other UI elements (Z-index management).
- **Long Lists**: If a dropdown has many items, it should handle internal scrolling with a themed scrollbar.
- **Screen Edges**: The menu should detect if it's near the edge of the screen and adjust its opening direction (e.g., open upwards if at the bottom).

## Technical Notes
- Implementation should favor a "single-file component" approach where possible, or a local `ui/` folder if it's used in multiple places.
- Use `framer-motion` or CSS transitions for the "bloom" and "slide" effects if already in the project (check dependencies).
- Consider using a library like `Headless UI` or `Radix UI` if complex accessibility logic is needed, but style it entirely from scratch.

## Dependencies
- Lucide React (for icons)
- Tailwind CSS (for styling)

