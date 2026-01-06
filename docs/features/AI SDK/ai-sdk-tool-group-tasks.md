# Feature Requirement Document: AI SDK Tool — groupTasks (Dumbo)

## Feature Name
AI SDK Tool: `groupTasks`

## Goal
To provide the Dumbo AI agent with the capability to organize scattered task nodes into logical clusters based on shared tags or semantic similarity. This helps users clean up their canvas and manage cognitive load by visually grouping related items.

## User Story
As a user, I want Dumbo to help me organize my board by grouping related tasks together, so that I can see my work in context and reduce visual clutter without manually moving every node.

## Functional Requirements

### 1. Tag-Based Grouping
- The tool must identify nodes that share the same tag (e.g., "#project-alpha", "#urgent", "#research").
- It must move these nodes into a visual "cluster" or designated area on the canvas.

### 2. Semantic Grouping (Optional/Future)
- If no tags are provided, Dumbo should attempt to identify related tasks based on their labels/content and group them under a new or existing cluster.

### 3. Preservation of Data
- The tool **must not** modify the content, status, or any internal data of the nodes (e.g., `data.label`, `data.dueDate`).
- Only the `position` (x, y coordinates) and potentially a `parentId` or `clusterId` (if using a container system) should be updated.

### 4. Tool Output
- The tool must return a JSON object containing:
    - `groupedNodes`: Array of `{ id, previousPosition, newPosition, clusterName }`.
    - `summary`: A brief count of nodes moved and the names of the clusters created/used.

## Data Requirements
- **Node Data Schema**: Nodes must have `position` (x, y) and optionally `tags`.
- **Context**: The tool requires the current `nodes` array and their positions from the active graph state.

## User Flow
1. **Selection**: User selects **Dumbo** from the agent picker.
2. **Trigger**: User prompts: "Group my tasks for Project X" or "Organize my board".
3. **Execution**: The AI SDK triggers the `groupTasks` tool call.
4. **Processing**: The system calculates new coordinates for the target nodes to form a cluster.
5. **Response**: Dumbo presents the update: "All done! I've huddled your Project X tasks together so they're easier to find."
6. **Interaction**: User can see the nodes move on the canvas (ideally with a smooth transition).

## Acceptance Criteria
- [ ] Tool correctly identifies nodes matching a specific tag or theme.
- [ ] Nodes are moved to a non-overlapping region near each other.
- [ ] Original node content remains entirely unchanged.
- [ ] Dumbo's persona is maintained in the final response.
- [ ] The operation is fully undoable (returning nodes to `previousPosition`).

## Edge Cases
- **Overlapping Clusters**: Ensure new clusters do not overlap with existing clusters or important nodes.
- **Large Boards**: If too many nodes are selected, the tool should limit the movement to a manageable set or inform the user.
- **Nodes without Tags**: Handle cases where the user asks to group everything but many nodes lack identifying metadata.

## Non-Functional Requirements
- **Performance**: Position calculations should be fast (< 200ms).
- **UX**: The visual movement should feel helpful and "cute," fitting Dumbo's intern persona.
- **Auditability**: Log the number of nodes moved and the tags used for grouping.

## References
- See also: [AI SDK Tool: checkDeadlines](./ai-sdk-tool-check-deadlines.md) for how Dumbo handles task metadata.

