# Feature Requirement Document: AI SDK Tool — checkDeadlines (Dumbo)

## Feature Name
AI SDK Tool: `checkDeadlines`

## Goal
To provide the Dumbo AI agent with the capability to automatically scan the user's canvas for tasks with deadlines, helping users identify overdue items and upcoming priorities. This reduces cognitive load and helps "break through inertia" by surfacing critical tasks.

## User Story
As a user, I want Dumbo (my AI intern) to scan my board for deadlines, so that I can quickly see what I've missed and what's coming up next without manually checking every node.

## Functional Requirements

### 1. Node Scanning
- The tool must scan all `GrimpoNode` objects in the active `graph_states` nodes array.
- It must inspect both structured fields (e.g., `data.dueDate`) and unstructured text fields (e.g., `data.label`, `data.content`).

### 2. Deadline Identification
- **Explicit**: Match nodes with a valid date in the `dueDate` field.
- **Implicit**: Use NLP/RegEx to identify date-like strings in node titles/labels (e.g., "Due Friday", "By 2024-01-20", "End of month").
- **Confidence Scoring**: Return a confidence score (0.0 to 1.0) for each identified deadline. Explicit fields should be 1.0.

### 3. Categorization
- **Overdue**: Deadlines that have passed relative to the current server/user time.
- **Upcoming**: Deadlines in the future (within a configurable window, e.g., next 7 days).
- **Today**: Specifically highlight items due on the current calendar day.

### 4. Tool Output
- The tool must return a JSON object containing:
    - `overdue`: Array of task objects `{ id, label, deadline, confidence }`.
    - `upcoming`: Array of task objects `{ id, label, deadline, confidence }`.
    - `today`: Array of task objects (optional subset).
    - `summary`: A brief count of items found.

### 5. Command Shortcuts (UI)
- The chat interface must provide "Quick Action" buttons for common deadline queries:
    - **Scan Deadlines**: Trigger a full scan of all nodes.
    - **Overdue**: Filter specifically for overdue items.
    - **Today**: Show only items due today.
    - **Urgent**: (Future) Prioritize based on proximity and importance.

## Data Requirements
- **Node Data Schema**: Nodes should ideally support a `dueDate` field in their `data` object.
- **Context**: The tool requires the full `nodes` array from the current graph state.
- **Timezone**: User's local timezone should be provided to the model/tool for accurate relative date parsing ("today", "tomorrow").

## User Flow
1. **Selection**: User selects **Dumbo** from the agent picker.
2. **Trigger**: User prompts: "Check my deadlines" or "What's overdue?".
3. **Execution**: The AI SDK triggers the `checkDeadlines` tool call.
4. **Processing**: The system fetches the current canvas nodes and parses them for dates.
5. **Response**: Dumbo presents the findings cheerfully: "I found 2 overdue tasks and 3 coming up soon! Here they are..."
6. **Action**: (Future) Dumbo may offer to `prioritizeTasks` or `setReminder` for the found items.

## Acceptance Criteria
- [ ] Tool correctly identifies explicit `dueDate` values.
- [ ] Tool successfully parses at least 3 types of implicit date strings (e.g., "YYYY-MM-DD", "DD/MM", "Next [Weekday]").
- [ ] Returned objects include the `id` of the source node for UI highlighting/linking.
- [ ] Dumbo's persona is maintained in the final response (cheerful, helpful intern).
- [ ] Handles cases with zero deadlines gracefully.

## Edge Cases
- **Ambiguous Dates**: "11/12" (Nov 12 vs Dec 11) - should default to localized preference or report low confidence.
- **Inconsistent Formats**: Mixed date formats across different nodes.
- **Large Board Performance**: If >100 nodes, ensure the scan doesn't block the UI or exceed token/timeout limits.
- **Recursive Deadlines**: (Out of scope for v1) Repeated tasks.

## Non-Functional Requirements
- **Performance**: Tool execution should take < 500ms (excluding model generation time).
- **Privacy**: Only scan nodes in the user's current active canvas.
- **Auditability**: Log the tool call and the number of nodes scanned.

## References
- See also: [AI SDK Tool: groupTasks](./ai-sdk-tool-group-tasks.md) for organizing identified tasks.

