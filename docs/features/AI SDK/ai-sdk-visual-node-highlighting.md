# Feature Requirement Document: Visual Node Highlighting from AI Queries

## 1. Feature Name
**Visual Node Highlighting via Dumbo Agent**

## 2. Goal
When users ask Dumbo questions about their tasks (e.g., "What's overdue?", "Show me today's deadlines"), instead of only providing text replies, Dumbo will **visually highlight the relevant nodes on the canvas** with glowing effects, making it immediately clear which tasks need attention.

## 3. User Story
As a user overwhelmed by many nodes on my canvas,
I want to ask Dumbo natural language questions about my tasks,
So that the relevant task cards are instantly highlighted/glowing on the canvas, making it easy to identify what needs my attention without reading through lists.

## 4. Functional Requirements

### 4.1 Query Detection
- Dumbo must recognize deadline/task-related queries:
  - "What's overdue?"
  - "Show me today's deadlines"
  - "What's urgent?"
  - "Scan deadlines"
  - Quick action buttons (Scan Deadlines, Overdue, Today, Urgent)

### 4.2 Node Identification
- For each query type, Dumbo must identify the correct subset of nodes:
  - **Overdue**: All nodes with `deadline < today` or implicit dates in the past
  - **Today**: All nodes with `deadline === today`
  - **Upcoming**: All nodes with `deadline > today` within 7 days
  - **Urgent**: Overdue + Today combined
  - **Scan Deadlines**: All nodes with any deadline (overdue, today, or upcoming)

### 4.3 Visual Highlighting
- When nodes are identified, apply visual effects to make them stand out:
  - **Glow effect**: Colored border/shadow based on urgency
    - Red glow for overdue tasks
    - Yellow/amber glow for today's tasks
    - Blue/cyan glow for upcoming tasks
  - **Pulse animation**: Gentle scale/opacity pulse to draw attention
  - **Duration**: Effect lasts 5-10 seconds, then fades out
  - **Clear action**: User can manually clear highlights or they auto-dismiss

### 4.4 Canvas Navigation
- Optional but helpful:
  - If highlighted nodes are off-screen, auto-zoom/pan to fit them in view
  - Or show a count indicator: "3 overdue tasks highlighted"

### 4.5 Chat Integration
- Dumbo still provides a brief text reply alongside the visual highlighting:
  - "🐙 I found 3 overdue tasks and highlighted them in red!"
  - "✨ 2 tasks due today are now glowing yellow on your canvas!"
  - Short, cheerful confirmation message

## 5. Data Requirements

### 5.1 API Response Shape
The `/api/chat` endpoint must return not just text, but also:
```typescript
{
  text: string; // Dumbo's reply
  highlightNodes?: {
    nodeIds: string[];
    color: 'red' | 'yellow' | 'blue' | 'cyan';
    duration?: number; // ms, default 8000
  };
}
```

### 5.2 State Management
- Frontend must track:
  - `highlightedNodeIds: string[]` - which nodes are currently highlighted
  - `highlightColor: string` - what color/urgency level
  - `highlightTimestamp: number` - when to clear the effect

## 6. User Flow

1. User clicks **"Overdue"** quick action button or types "what's overdue?"
2. Frontend sends message to `/api/chat` with `agent: "dumbo"`
3. Backend:
   - Runs `checkDeadlines()` to scan canvas nodes
   - Filters for overdue tasks
   - Returns: `{ text: "🐙 Found 3 overdue tasks!", highlightNodes: { nodeIds: [...], color: 'red' } }`
4. Frontend:
   - Displays Dumbo's text reply in chat
   - **Triggers canvas highlight**: Applies red glow + pulse animation to the 3 overdue nodes
   - Optionally zooms canvas to show all highlighted nodes
5. After 8 seconds (or user clicks "Clear"), the glow effect fades out

## 7. Acceptance Criteria

- [ ] When user clicks "Overdue" button, overdue nodes glow red on the canvas
- [ ] When user clicks "Today" button, today's nodes glow yellow/amber on the canvas
- [ ] When user clicks "Scan Deadlines", all deadline nodes glow with appropriate colors
- [ ] Glow effect includes a subtle pulse animation
- [ ] Effect auto-clears after 8 seconds
- [ ] Dumbo provides a brief, cheerful text confirmation in the chat
- [ ] User can manually clear highlights with a "Clear" or "Reset" button
- [ ] Works seamlessly with the existing React Flow canvas

## 8. Edge Cases

- **No matching nodes**: If no overdue/today tasks exist, Dumbo says "🌊 All clear! No overdue tasks found!" and no highlighting occurs
- **Off-screen nodes**: Optionally pan/zoom to show highlighted nodes, or show a "X tasks highlighted (some off-screen)" message
- **Multiple simultaneous queries**: New highlight request clears previous highlights
- **Agent switching**: Switching from Dumbo to Dumby/Grimpy should clear any active highlights

## 9. Non-Functional Requirements

### 9.1 Performance
- Highlighting should apply instantly (<100ms after API response)
- No lag when highlighting 10+ nodes simultaneously

### 9.2 UX
- Glow effect should be noticeable but not overwhelming
- Colors should be accessible (sufficient contrast)
- Animation should be smooth (60fps)

### 9.3 Accessibility
- In addition to visual glow, provide text count in chat: "3 tasks highlighted"
- Allow keyboard shortcut to clear highlights (ESC key)

## 10. Implementation Notes

### 10.1 Frontend Components
- Update `app/components/AgentChat.tsx` to:
  - Parse API responses for `highlightNodes` data
  - Emit events/callbacks to parent component with node IDs to highlight
  
- Update `app/components/GrimpoCanvas.tsx` (or main canvas component) to:
  - Accept highlight state via props or context
  - Apply CSS classes to highlighted nodes
  - Implement auto-clear timer

### 10.2 Backend Changes
- Update `app/api/chat/route.ts` to:
  - Return structured response with `highlightNodes` field
  - Map deadline results to node IDs with appropriate colors

### 10.3 Styling
- Add CSS classes in global styles or Tailwind:
  - `.node-highlight-red` - red glow for overdue
  - `.node-highlight-yellow` - yellow glow for today
  - `.node-highlight-blue` - blue glow for upcoming
  - Include `@keyframes pulse` animation

## 11. Future Enhancements
- Multiple highlight colors simultaneously (e.g., both overdue and today)
- Clicking a highlighted node shows more details in chat
- Persistent "pin" mode: Keep highlights until user manually clears
- Highlight grouping: Show connected tasks as a cluster

