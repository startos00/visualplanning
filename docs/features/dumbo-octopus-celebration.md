# Feature Requirement Document: Dumbo Octopus Celebration Animation

## Feature Name
Dumbo Octopus Celebration Animation

## Goal
Provide delightful visual feedback when users complete tactical tasks by displaying a dumbo octopus swimming across the background. This feature enhances the underwater theme of the application and creates a satisfying moment of celebration when tasks are marked as "Done", reinforcing positive user behavior and engagement with the deep-sea metaphor.

## User Story
As a user working in the Grimpo visual workspace, I want to see a dumbo octopus swim across the background when I mark a tactical task as "Done", so that I feel rewarded for completing tasks and remain engaged with the underwater-themed interface.

## Functional Requirements

1. **Trigger Mechanism**
   - The octopus animation must trigger when a user checks the "Done" checkbox on a tactical card
   - The animation should NOT trigger when unchecking the "Done" checkbox
   - The trigger must be immediate upon checkbox state change to "done"

2. **Visual Design**
   - The octopus must be a CSS-based animated shape (no external images or SVGs)
   - The octopus should use colors from the existing design system (cyan/blue tones: `cyan-300`, `cyan-400`, `cyan-500`)
   - The octopus should be visible but not intrusive (semi-transparent, subtle glow effect)
   - Size should be appropriate for background animation (approximately 60-100px)

3. **Animation Behavior**
   - The octopus must swim across the screen horizontally (left to right or right to left)
   - Animation duration should be 3-5 seconds
   - After swimming across, the octopus must fade out smoothly
   - Total animation cycle: swim + fade out should complete within 5-6 seconds
   - Animation should use CSS keyframes for smooth performance

4. **Multiple Instances**
   - Multiple octopuses must be able to appear simultaneously if multiple tasks are marked done quickly
   - Each octopus instance should be independent and not interfere with others
   - Octopuses should spawn at different vertical positions to avoid overlap

5. **Layering and Positioning**
   - The octopus must appear in the background layer, behind the React Flow canvas
   - The octopus must not interfere with node interactions or canvas controls
   - Z-index must be lower than React Flow nodes but visible above the background gradient

6. **Performance**
   - Animation must not cause performance degradation or lag
   - Octopus instances must be cleaned up after animation completes to prevent memory leaks
   - CSS animations should be hardware-accelerated (use `transform` and `opacity`)

## Data Requirements

No new data structures or persistence required. This is a purely visual, ephemeral feature that:
- Reads the existing `status` field change on tactical nodes (already exists in `GrimpoNodeData`)
- Does not persist any state
- Does not require database changes or localStorage modifications

## User Flow

1. User views a tactical card in the workspace
2. User clicks the "Done" checkbox on the tactical card
3. Checkbox state changes to checked (`status: "done"`)
4. **NEW:** Dumbo octopus appears at a random vertical position on the left or right side of the screen
5. Octopus swims horizontally across the viewport (left-to-right or right-to-left)
6. After completing the swim, octopus fades out over 1 second
7. Octopus element is removed from the DOM after fade completes
8. If user marks another task as done during the animation, a new octopus appears independently

## Acceptance Criteria

1. ✅ When a user checks the "Done" checkbox on a tactical card, a dumbo octopus appears and swims across the screen
2. ✅ The octopus animation completes (swim + fade) within 5-6 seconds
3. ✅ The octopus uses CSS-based styling matching the cyan/blue color scheme
4. ✅ Multiple octopuses can appear simultaneously without visual conflicts
5. ✅ The octopus does not interfere with React Flow interactions (nodes remain draggable, canvas remains pannable)
6. ✅ The animation performs smoothly without lag or jank (60fps target)
7. ✅ Octopus instances are properly cleaned up after animation completes
8. ✅ The feature works across different viewport sizes and zoom levels
9. ✅ Unchecking the "Done" checkbox does not trigger the animation

## Edge Cases

1. **Rapid Task Completion**
   - If user marks 5+ tasks as done within 2 seconds, multiple octopuses should spawn without performance issues
   - Each octopus should spawn at a different vertical position to minimize visual overlap

2. **Viewport Changes During Animation**
   - If user pans or zooms the canvas during octopus animation, the octopus should continue its animation relative to the viewport
   - Octopus position should be relative to the viewport, not the React Flow coordinate system

3. **Browser Performance**
   - On low-end devices, if multiple octopuses cause performance issues, consider limiting to 3-5 simultaneous instances
   - Use CSS `will-change` property for optimization, but remove it after animation

4. **Zoom Levels**
   - Animation should be visible and appropriately sized at all zoom levels (0.5x to 2x)
   - Octopus size may need to scale with zoom level for visibility

5. **Window Resize**
   - If user resizes browser window during animation, octopus should continue smoothly
   - Octopus should not disappear or glitch during resize

6. **Task Deletion During Animation**
   - If user deletes a task or marks it undone while octopus is animating, the octopus should continue its animation (no interruption)

7. **Multiple Browser Tabs**
   - Each tab instance should have independent octopus animations (no cross-tab interference)

## Non-Functional Requirements

1. **Performance**
   - Animation must use CSS transforms and opacity for hardware acceleration
   - No JavaScript-based animation loops (use CSS keyframes)
   - Maximum 5 simultaneous octopuses before throttling (if needed)

2. **Accessibility**
   - Animation should respect `prefers-reduced-motion` media query
   - If user has reduced motion preference, skip animation or show instant fade

3. **Browser Compatibility**
   - Must work in modern browsers (Chrome, Firefox, Safari, Edge)
   - Graceful degradation: if CSS animations not supported, feature silently fails (no errors)

4. **Code Maintainability**
   - Implementation should be simple and beginner-friendly (aligns with project constraints)
   - Use existing patterns (similar to `octo-breath` animation in `globals.css`)
   - No external dependencies required

5. **Visual Consistency**
   - Octopus design should feel cohesive with the existing underwater theme
   - Colors must match the design system (`cyan-*` palette)
   - Animation style should complement existing `octo-breath` animation

## Technical Notes

- **Implementation Location**: 
  - New component: `app/components/DumboOctopus.tsx` (or similar)
  - CSS animations: Add to `app/globals.css`
  - Trigger logic: Modify `app/nodes/GlassNode.tsx` checkbox handler
  - State management: Add state in `app/page.tsx` to track active octopus instances

- **CSS Animation Approach**:
  - Use `@keyframes` for swim and fade animations
  - Combine `transform: translateX()` for horizontal movement
  - Use `opacity` for fade in/out
  - Consider `animation-timing-function: ease-in-out` for natural movement

- **React Implementation**:
  - Use `useState` to track active octopus instances (array of IDs)
  - Use `useEffect` to clean up octopus elements after animation
  - Spawn octopus component when checkbox changes to "done"
  - Randomize starting position (left/right) and vertical position

- **Z-Index Layering**:
  - Background gradient: `z-index: 0`
  - Octopus animations: `z-index: 1`
  - React Flow canvas: `z-index: 10` (default)
  - UI overlays (mode toggle, FAB): `z-index: 50` (existing)

## Dependencies

- No new dependencies required
- Uses existing: React, Tailwind CSS, CSS animations
- No external libraries or assets needed

## Future Enhancements (Out of Scope)

- Different octopus styles for different task types
- Sound effects (would require audio library)
- Octopus swimming patterns (curved paths, vertical movement)
- User preference to disable/enable celebration animations
- Octopus size variation based on task importance

