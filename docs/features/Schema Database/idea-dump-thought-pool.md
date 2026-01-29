# Feature Requirement Document: Idea Dump — The Thought Pool

## Feature Name
Idea Dump — The Thought Pool

## Goal
Provide users with a dedicated space to quickly capture raw ideas, notes, sketches, images, and fleeting thoughts without the friction of structured node creation. Ideas can be viewed in two modes (**To-Do List** or **Cards**) and transformed into **Tactical Cards** on the canvas. The **Generate Plan** feature acts as an interactive **workshop with Grimpy**, where users can provide the most abstract input and receive structured, timeline-based plans with milestones.

## User Story
As a user, I want a quick-capture area where I can dump unstructured ideas, sketches, and images, so that I can capture them before they escape and later work with Grimpy in a workshop-style session to transform them into strategic plans and actionable tasks across different timelines.

## Functional Requirements

### 1. The Thought Pool Panel
- A collapsible side panel or modal accessible via a dedicated button (e.g., "Thought Pool" or a brain/bubble icon).
- Positioned in a non-intrusive location (e.g., left sidebar or accessible via keyboard shortcut).
- The panel should float above the canvas without blocking primary interactions.

### 2. Quick Capture Input
- A fast-input text field at the top of the panel.
- Pressing **Enter** adds the idea to the pool immediately.
- Support for multi-line input via **Shift+Enter**.
- **Image/Sketch Upload**: Drag-and-drop or click-to-upload images, sketches, whiteboard photos.
- **Paste Support**: Paste images directly from clipboard.
- Optional: Voice-to-text input for hands-free capture (future enhancement).

### 3. Two View Modes
The user can toggle between two display modes:

#### Mode A: To-Do List View
- Ideas displayed as a vertical, scrollable checklist.
- Each item has:
  - A checkbox (to mark as "processed" or "done").
  - The idea text or image thumbnail (editable inline for text).
  - A subtle timestamp showing when it was captured.
  - A "..." menu with actions: Edit, Delete, Convert to Tactical Card, Add to Grimpy Workshop, Archive to Resource Chamber.
- Drag-and-drop reordering supported.

#### Mode B: Cards View
- Ideas displayed as small, floating cards in a masonry/grid layout.
- Each card has:
  - The idea text (truncated with expand on click) or image preview.
  - A colored tag/label (optional, user-assignable).
  - Quick action buttons: Delete, Convert to Tactical Card, Add to Grimpy Workshop.
- Cards can be color-coded or tagged for rough categorization.

### 4. Convert to Tactical Card
- Any idea can be converted to a **Tactical Card (Node)** on the canvas.
- Clicking "Convert to Tactical Card" spawns a new cyan tactical node at a default position (or near the user's current viewport center).
- The original idea is marked as "processed" (visually dimmed or moved to a "Processed" section).
- For image-based ideas, the image is attached to the tactical card's notes or as a reference.

### 5. Grimpy Workshop: Generate Plan (Interactive Planning Session)

The core feature that transforms abstract ideas into structured, actionable plans.

#### 5.1 Workshop Trigger
- A prominent **"Workshop with Grimpy"** button at the bottom of the panel.
- When clicked, Grimpy initiates an **interactive interview session**.

#### 5.2 Input Types Accepted
Grimpy can work with:
- **Text ideas**: Abstract concepts, rough notes, brain dumps.
- **Sketches**: Hand-drawn diagrams, flowcharts, mind maps.
- **Images**: Whiteboard photos, screenshots, inspiration images.
- **Mixed**: Any combination of the above.

#### 5.3 Grimpy Interview Process
Before generating a plan, Grimpy conducts a structured interview to gather context:

1. **Project Understanding**
   - "What's the main goal you're trying to achieve?"
   - "Is this a new project or part of something existing?"

2. **Scope & Constraints**
   - "Do you have a deadline or target date?"
   - "Are there any constraints I should know about? (budget, resources, dependencies)"

3. **Timeline Preference**
   - "What planning horizon works best for you?"
     - Daily tasks (Today/Tomorrow)
     - Weekly breakdown
     - Monthly milestones
     - Quarterly objectives
     - Full project phases

4. **Output Style**
   - "How would you like this structured?"
     - Step-by-step To-Do list
     - Strategy → Tactics hierarchy
     - Milestone-based roadmap
     - Phased approach with gates

5. **Depth of Detail**
   - "How granular should the tasks be?"
     - High-level overview only
     - Moderate detail
     - Highly detailed with sub-tasks

#### 5.4 Plan Generation Options

| Timeline | Description | Output |
|----------|-------------|--------|
| **Daily** | Micro-tasks for immediate execution | Tactical cards for today/tomorrow |
| **Weekly** | 7-day sprint breakdown | Weekly goals + daily tactical cards |
| **Monthly** | 4-week roadmap | Weekly milestones + key tactical cards |
| **Quarterly** | 3-month strategic plan | Monthly milestones + strategic nodes |
| **Project Phases** | Full lifecycle planning | Phases → Milestones → Strategy → Tactics |

#### 5.5 Output Structure

Grimpy generates a hierarchical plan:

```
📍 MILESTONES (time-bound checkpoints)
   └── 🔴 STRATEGY NODES (high-level goals)
       └── 🔵 TACTICAL CARDS (executable tasks)
```

- **Milestones**: Key checkpoints with target dates (e.g., "MVP Complete - Week 4")
- **Strategy Nodes**: High-level objectives (red nodes)
- **Tactical Cards**: Small, actionable tasks for execution (cyan nodes)

#### 5.6 Plan Customization
After generation, users can:
- Adjust timeline assignments
- Add/remove tasks
- Reorder priorities
- Request Grimpy to expand specific sections
- Request Grimpy to simplify or consolidate

### 6. Idea Storage & Lifecycle

#### 6.1 Archive to Resource Chamber
- Ideas can be saved to the **Resource Chamber** for future reference.
- Useful for ideas that aren't actionable now but may be valuable later.
- Archived ideas are tagged with source metadata (date, project, original context).

#### 6.2 Delete Forever
- Ideas can be permanently deleted from the system.
- Confirmation required: "Delete this idea permanently? This cannot be undone."
- Deleted ideas are purged from database (not soft-deleted).

#### 6.3 Processed State
- Ideas that have been converted to plans/tasks are marked as "Processed".
- Processed ideas show a link to the generated nodes on canvas.
- Users can choose to:
  - Keep processed ideas visible (dimmed)
  - Auto-archive to Resource Chamber
  - Auto-delete after conversion

### 7. Batch Operations
- Select multiple ideas (checkboxes or Cmd/Ctrl+Click in Cards view).
- Batch actions:
  - Delete Selected
  - Convert All to Tactical Cards
  - Add to Grimpy Workshop
  - Archive to Resource Chamber

### 8. Persistence
- Ideas are persisted to the database (Supabase) per user and per project.
- Ideas sync across sessions and devices.
- Images stored as blob URLs or base64 with size limits.

## Data Requirements

### Idea Schema (Database Table: `ideas` or `thought_pool`)
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | UUID | Foreign key to project |
| `user_id` | UUID | Foreign key to user |
| `content` | TEXT | The idea text |
| `image_url` | TEXT | URL/base64 for image-based ideas |
| `idea_type` | ENUM | 'text', 'image', 'sketch', 'mixed' |
| `tag` | VARCHAR(50) | Optional tag/label |
| `color` | VARCHAR(20) | Optional color code |
| `status` | ENUM | 'active', 'processed', 'archived', 'deleted' |
| `processed_node_ids` | UUID[] | Links to generated canvas nodes |
| `sort_order` | INTEGER | For manual reordering |
| `created_at` | TIMESTAMP | When the idea was captured |
| `updated_at` | TIMESTAMP | Last modification time |

### Workshop Session Schema (for interview state)
| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `project_id` | UUID | Foreign key to project |
| `user_id` | UUID | Foreign key to user |
| `idea_ids` | UUID[] | Ideas included in this workshop |
| `interview_state` | JSONB | Collected answers from Grimpy interview |
| `generated_plan` | JSONB | The output plan structure |
| `timeline_type` | ENUM | 'daily', 'weekly', 'monthly', 'quarterly', 'phases' |
| `status` | ENUM | 'in_progress', 'completed', 'cancelled' |
| `created_at` | TIMESTAMP | Session start time |

## User Flow

### A. Quick Capture
1. User clicks the "Thought Pool" button or presses keyboard shortcut (e.g., `Cmd+Shift+I`).
2. The Thought Pool panel slides open.
3. User types an idea and presses Enter, or drags in an image/sketch.
4. The idea appears in the list/cards immediately.
5. User continues capturing or closes the panel.

### B. Review and Organize
1. User opens the Thought Pool to review captured ideas.
2. User toggles between List and Cards view based on preference.
3. User reorders, tags, or deletes ideas as needed.
4. User converts individual ideas to Tactical Cards on canvas.

### C. Workshop with Grimpy (Full Planning Session)
1. User selects several related ideas (text, images, sketches).
2. User clicks **"Workshop with Grimpy"**.
3. Grimpy greets the user and begins the interview:
   - "I see you have 5 ideas to work with. Let's turn these into a plan."
   - "First, what's the main goal here?"
4. User answers Grimpy's questions (via chat interface).
5. Grimpy asks about timeline preference:
   - "Would you like daily tasks, a weekly breakdown, monthly milestones, or a full project roadmap?"
6. User selects "Monthly milestones".
7. Grimpy generates the plan:
   - 4 Milestone nodes (one per week)
   - Strategy nodes under each milestone
   - Tactical cards for execution
8. Plan is spawned on the canvas with proper hierarchy and connections.
9. Grimpy summarizes: "Done! I've created 4 milestones, 8 strategies, and 24 tactical cards."
10. User can request adjustments: "Can you break down Week 2 into more detail?"
11. Original ideas are marked as processed with links to generated nodes.

### D. Archive to Resource Chamber
1. User has ideas they want to keep but not act on now.
2. User selects ideas and clicks "Archive to Resource Chamber".
3. Ideas are moved to Resource Chamber with metadata preserved.
4. Ideas are removed from active Thought Pool view.

### E. Delete Forever
1. User wants to permanently remove irrelevant ideas.
2. User selects ideas and clicks "Delete Forever".
3. Confirmation dialog appears.
4. On confirm, ideas are permanently deleted.

## Acceptance Criteria
- [ ] The Thought Pool panel opens/closes smoothly without blocking canvas interaction.
- [ ] Ideas can be added via quick-input with Enter key.
- [ ] Images and sketches can be uploaded or pasted into the Thought Pool.
- [ ] Users can toggle between List and Cards view modes.
- [ ] Ideas can be reordered via drag-and-drop (List view).
- [ ] Individual ideas can be converted to Tactical Cards on the canvas.
- [ ] The "Workshop with Grimpy" button initiates an interactive interview session.
- [ ] Grimpy asks relevant questions to understand scope, timeline, and output preferences.
- [ ] Users can select timeline type: daily, weekly, monthly, quarterly, or phases.
- [ ] Grimpy generates milestones, strategy nodes, and tactical cards based on interview.
- [ ] Generated plans include proper hierarchy and edge connections.
- [ ] Ideas can be archived to Resource Chamber with metadata.
- [ ] Ideas can be permanently deleted with confirmation.
- [ ] Processed ideas show links to generated canvas nodes.
- [ ] Ideas persist across sessions (database-backed).
- [ ] Batch operations work correctly.

## Edge Cases
- **Empty Ideas**: Prevent adding blank/whitespace-only ideas.
- **Very Long Ideas**: Truncate display in Cards view; show full text on expand/edit.
- **Large Images**: Compress or reject images exceeding size limit with clear message.
- **No Ideas Selected for Workshop**: Show friendly prompt asking user to add ideas first.
- **Incomplete Interview**: Allow users to exit workshop early; save partial state for resumption.
- **Vague Input**: Grimpy asks more probing questions rather than generating a weak plan.
- **Conflicting Timeline**: If ideas span different scopes, Grimpy suggests splitting into multiple plans.
- **Resource Chamber Full**: Warn user and suggest cleanup (future enhancement).

## Non-Functional Requirements
- **Performance**: The panel should open instantly (<100ms). Adding ideas should feel instantaneous.
- **UX**: Minimal friction for capture—the path from thought to saved idea should be as fast as possible.
- **Accessibility**: Keyboard navigation for all actions. Screen reader support for list items.
- **Theme Consistency**: Panel styling should match the Abyss/Surface theme (dark glassmorphism for Abyss, light mode for Surface).
- **Animations**: Use Framer Motion for smooth panel transitions and card animations.

## Visual Design Notes
- **Abyss Theme**: Dark translucent panel with bioluminescent accents. Ideas glow softly like deep-sea organisms.
- **Thought Bubbles**: In Cards view, ideas appear as floating thought bubbles rising from the depths.
- **Workshop Mode**: When Grimpy workshop is active, the panel transforms into a focused chat interface with Grimpy's avatar prominent.
- **Milestone Visualization**: Generated milestones appear as glowing waypoints on the canvas, connected by a "timeline edge".
- **Grimpy Integration**: The "Workshop with Grimpy" button features a small Grimpy icon with a subtle pulsing glow indicating readiness.

## References
- [Grimpy Agent Spec](./AI%20SDK/grimpo-ai-agents-deep-sea-hierarchy.md) — for `generateProjectPlan` tool details.
- [Mind's Eye Whiteboard Scanner](./AI%20SDK/minds-eye-whiteboard-scanner.md) — for image-to-plan conversion patterns.
- [Creation Dock](./creation-dock.md) — for UI positioning and interaction patterns.
- [Resource Chamber](./the-resource-chamber.md) — for archive storage integration.
