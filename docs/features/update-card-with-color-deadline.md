# Feature Requirement Document (FRED): Update Card with Color & Deadline

## Feature Name
Update Card with Color & Deadline

## Goal
Enhance the BiolumNode.tsx (GlassNode.tsx) component with visual customization capabilities through a deadline date picker and a bioluminescent color picker. The deadline feature provides time pressure visualization by automatically highlighting overdue cards with a red border. The color picker allows users to theme their cards with deep-sea neon colors, creating visual organization and personalization within the spatial workspace.

## User Story
As a user organizing my planning workspace, I want to set deadlines on cards and choose bioluminescent colors to visually categorize and prioritize tasks, so that I can quickly identify urgent items and create a personalized visual hierarchy in my deep-sea workspace.

## Functional Requirements

### 1) Deadline Date Picker (Time Pressure)

- **Placement**
  - Add a standard HTML `<input type="date" />` element in the top-right corner of the card
  - Position it next to the "Swallow" button (for tactical nodes) or in the top-right area for other node types
  - The date input should be visible on all node types (strategy, tactical, resource)

- **Styling**
  - Make the input small and subtle
  - Use transparent background (`bg-transparent`)
  - Text color should be white (`text-white`)
  - The input should look subtle until hovered (enhanced visibility on hover)
  - Maintain consistency with the existing deep-sea neon aesthetic

- **Overdue Logic**
  - When a deadline date is set, compare it with the current date
  - If the current date is past the selected deadline date, automatically turn the card border red
  - The red border should override the default cyan border and any selected color border
  - The overdue state should update dynamically (check on component render and when date changes)
  - If no deadline is set, or if the deadline is in the future, do not apply the red border

- **Data Persistence**
  - The deadline date value must be stored in the node's data structure
  - The deadline should persist across page refreshes (via existing storage mechanism)
  - Add `deadline?: string` field to `GrimpoNodeData` type (ISO date string format: "YYYY-MM-DD")

### 2) Bioluminescent Color Picker (Theme)

- **Color Palette (Deep Sea Neon)**
  - Provide exactly 5 color options as small circular buttons:
    - **Cyan** (Default - `#22d3ee`) - Default theme color
    - **Magenta** (Urgent - `#e879f9`) - For urgent items
    - **Lime** (Safe - `#a3e635`) - For safe/stable items
    - **Amber** (Warning - `#fbbf24`) - For warnings
    - **Violet** (Creative - `#8b5cf6`) - For creative items

- **Placement**
  - Add a row of 5 small circular buttons at the bottom of the card
  - Position them below the existing content (notes, status checkbox, etc.)
  - The color picker should be visible on all node types

- **Visual Design**
  - Each color button should be a small circle (approximately 20-24px diameter)
  - Buttons should be arranged horizontally with appropriate spacing
  - The currently selected color should be visually indicated (e.g., larger size, ring border, or glow effect)
  - Maintain the deep-sea neon aesthetic with subtle glow effects

- **Interaction Behavior**
  - When a user clicks a color dot:
    - Update the node's state with the selected color value
    - Change the card's border color to match the selection
    - Change the card's glow shadow (`box-shadow`) to match the selection
    - The color change should apply immediately with smooth transitions
  - The default color (Cyan) should be applied if no color is explicitly selected

- **Edge Color Synchronization (Optional Enhancement)**
  - If the card is connected to other nodes via edges:
    - Change the edge/line color of outgoing connections to match the selected card color
    - This creates visual continuity between connected nodes
  - Note: This is marked as optional but adds visual polish

- **Data Persistence**
  - The selected color value must be stored in the node's data structure
  - The color should persist across page refreshes
  - Add `color?: string` field to `GrimpoNodeData` type (hex color string format: "#22d3ee")

### 3) Visual Priority Rules

- **Border Color Priority**
  - Overdue state (red border) takes highest priority
  - If overdue: always show red border regardless of selected color
  - If not overdue: show selected color border (or default cyan if no color selected)
  - Selected state (when node is selected) should enhance the glow but not override color/overdue rules

- **Glow Shadow**
  - Apply glow shadow matching the selected color (or default cyan)
  - Overdue cards may optionally have a red glow in addition to or instead of the color glow
  - Selected nodes should have enhanced glow intensity

## Data Requirements

- **Node Data Schema Updates**
  - Extend `GrimpoNodeData` type in `app/lib/graph.ts`:
    ```typescript
    export type GrimpoNodeData = {
      title: string;
      notes?: string;
      deadline?: string;  // ISO date string: "YYYY-MM-DD"
      color?: string;     // Hex color string: "#22d3ee"
      // ... existing fields
    };
    ```

- **Storage**
  - Deadline and color values persist via existing node storage mechanism (likely localStorage via `saveState`/`loadState`)
  - No new storage keys required; values are part of node data

- **Default Values**
  - If `deadline` is undefined/null/empty: no deadline set, no overdue state
  - If `color` is undefined/null/empty: use default Cyan (`#22d3ee`)

## User Flow

1. **Setting a Deadline**
   - User opens/clicks on a card node
   - User locates the date input in the top-right corner
   - User clicks the date input and selects a date from the calendar picker
   - The date is saved to the node's data
   - If the selected date is in the past, the card border immediately turns red
   - If the selected date is in the future, the card maintains its normal/selected color

2. **Selecting a Color**
   - User opens/clicks on a card node
   - User scrolls to the bottom of the card (if needed)
   - User sees a row of 5 circular color buttons
   - User clicks on a desired color (Cyan, Magenta, Lime, Amber, or Violet)
   - The card's border and glow shadow immediately update to match the selected color
   - If the card has outgoing connections, the edge colors update to match (optional)
   - The selected color persists when the user refreshes the page

3. **Overdue Detection**
   - User sets a deadline date
   - As time passes, if the current date exceeds the deadline:
     - The card border automatically turns red (overdue state)
     - The red border overrides any selected color
   - User can clear the deadline by deleting/clearing the date input to remove overdue state

4. **Combined Usage**
   - User can set both a deadline and a color
   - If the deadline is not overdue: card shows selected color
   - If the deadline becomes overdue: card shows red border (overdue takes priority)
   - User can change color at any time (unless overdue, then red takes priority)

## Acceptance Criteria

- **Deadline Functionality**
  - A date input appears in the top-right corner of all card types
  - The date input is small, transparent, and white text, subtle until hovered
  - Selecting a past date immediately turns the card border red
  - Selecting a future date does not apply red border
  - The deadline value persists across page refreshes
  - Clearing the date input removes the overdue state

- **Color Picker Functionality**
  - A row of 5 circular color buttons appears at the bottom of all card types
  - Clicking a color button updates the card border color immediately
  - Clicking a color button updates the card glow shadow (`box-shadow`) immediately
  - The selected color is visually indicated (e.g., larger size, ring, or glow)
  - The color value persists across page refreshes
  - Default color (Cyan) is applied when no color is selected

- **Visual Priority**
  - Overdue cards always show red border, regardless of selected color
  - Non-overdue cards show selected color border (or default cyan)
  - Selected nodes have enhanced glow while maintaining color/overdue rules

- **Edge Color (Optional)**
  - Outgoing edges from a colored node match the node's color
  - Edge colors update when node color changes
  - Edge colors persist across refreshes

- **Integration**
  - Feature works on all node types (strategy, tactical, resource)
  - Feature does not break existing functionality (swallow, done checkbox, notes, etc.)
  - Feature maintains existing styling and aesthetic consistency

## Edge Cases

- **Date Input Edge Cases**
  - User selects today's date: should not be overdue (current date is not past)
  - User clears/deletes the date input: remove overdue state, return to normal/selected color
  - Invalid date format: gracefully handle (ignore invalid input, maintain previous state)
  - Date input in different timezones: use local date comparison (compare dates, not timestamps)

- **Color Selection Edge Cases**
  - User clicks the same color twice: no visual change needed, state remains consistent
  - Invalid color value in stored data: fall back to default Cyan
  - Color value is undefined/null: apply default Cyan

- **Overdue Detection Edge Cases**
  - Page loads with an overdue deadline: red border should appear immediately
  - Date changes while page is open: overdue state should update (may require periodic check or date change listener)
  - Multiple cards with different deadlines: each card independently shows overdue state

- **Combined State Edge Cases**
  - Card is overdue AND user selects a color: red border takes priority
  - User clears deadline while color is selected: card shows selected color
  - User selects color while overdue: red border remains (overdue priority)

- **Storage Edge Cases**
  - Corrupted deadline/color data: gracefully handle, use defaults
  - Missing deadline/color fields: treat as undefined, use defaults
  - Migration from old node data: existing nodes without deadline/color should work normally

- **Visual Edge Cases**
  - Card is selected AND overdue: red border with enhanced glow
  - Card is selected AND colored: colored border with enhanced glow
  - Card is done (tactical status="done"): opacity reduced but color/overdue still visible

- **Edge Color Edge Cases (Optional)**
  - Node has no outgoing edges: no edge color update needed
  - Node color changes but edges are already that color: no visual change
  - Multiple edges from same node: all edges update to match node color

## Non-Functional Requirements

- **Performance**
  - Date comparison should be O(1) and not cause visible lag
  - Color updates should be immediate with smooth CSS transitions
  - No unnecessary re-renders when deadline/color changes

- **Accessibility**
  - Date input should be keyboard accessible
  - Color buttons should be keyboard accessible (tab navigation, enter/space to select)
  - Color selection should have sufficient contrast for visibility
  - Consider ARIA labels for color buttons (e.g., "Select Cyan color")

- **Browser Compatibility**
  - Use standard HTML5 `<input type="date" />` (supported in modern browsers)
  - Fallback for older browsers: may need to handle date input differently or show warning

- **UX / Visual Quality**
  - Color picker should feel integrated with the deep-sea neon aesthetic
  - Transitions should be smooth (200ms duration, matching existing transitions)
  - Overdue red should be noticeable but not jarring
  - Color buttons should have hover states for better interactivity

- **Code Simplicity (Per Guardrails)**
  - Use standard HTML `<input type="date" />` (no date picker libraries)
  - Use React `useState` for local state (no Redux/Zustand)
  - Use simple date comparison logic (no complex date libraries)
  - Keep implementation straightforward and hackathon-friendly

## Implementation Notes

- **Component Location**
  - Update `app/nodes/GlassNode.tsx` (or create `BiolumNode.tsx` if replacing)
  - Update `app/lib/graph.ts` to add `deadline` and `color` fields to `GrimpoNodeData`

- **Styling Approach**
  - Use Tailwind CSS classes for styling (consistent with existing codebase)
  - Use dynamic className construction for border colors based on state
  - Use inline styles or Tailwind arbitrary values for dynamic box-shadow colors

- **Date Comparison**
  - Compare dates using simple string comparison (ISO format "YYYY-MM-DD" is sortable)
  - Or use `new Date(deadline) < new Date()` for comparison
  - Handle timezone considerations (use local date, not UTC)

- **Color Application**
  - Store hex color values as strings (e.g., "#22d3ee")
  - Apply border color via Tailwind arbitrary values: `border-[#22d3ee]`
  - Apply glow shadow via Tailwind arbitrary values: `shadow-[0_0_14px_rgba(34,211,238,0.18)]`
  - Convert hex to rgba for shadow opacity: `rgba(34,211,238,0.18)` for Cyan

- **Edge Color Updates (Optional)**
  - Access edges via React Flow's edge state
  - Update edge `style.stroke` property to match node color
  - May require passing edge update callback or accessing edge state from parent

- **Testing Considerations**
  - Test deadline with past, present, and future dates
  - Test color selection with all 5 colors
  - Test overdue priority over color selection
  - Test persistence across page refresh
  - Test on all node types (strategy, tactical, resource)

