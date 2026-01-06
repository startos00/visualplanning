# Feature Requirement Document: GRIMPO AI AGENTS — The Deep Sea Hierarchy (AI SDK)

## Feature Name
GRIMPO AI AGENTS — The Deep Sea Hierarchy (AI SDK)

## Goal
Introduce a **manual-select, multi-agent** assistant system (“GRIMPO”) powered by **Vercel AI SDK tool calling** so users can explicitly choose an agent persona and capability set to:
- manage tasks, reduce stress, and break through inertia (Dumbo),
- process resources into actionable notes (Dumby),
- generate strategic plans, connect goals to execution, and bust through cognitive blocks (Grimpy).

The system must support:
- **Vercel AI SDK** (`ai`, `@ai-sdk/google`, `zod`)
- Model selection:
  - **Gemini 3.0 Flash** for speed and high-quality tool calling
- **Immediate apply** mutations to the canvas (with **Undo** as a first-class requirement).

## User Story
As a user, I want to choose between specialized AI agents (Dumbo, Dumby, Grimpy) and ask them to act on my canvas, so that I can organize tasks, summarize resources, and generate project plans faster without leaving my workspace.

## Functional Requirements

### 1. Agent Picker (Manual Selection)
- The UI must provide a clear **agent picker** allowing the user to select exactly one agent for the current interaction:
  - **Dumbo** (Level 1: Intern)
  - **Dumby** (Level 2: Manager)
  - **Grimpy** (Level 3: Architect)
- The chosen agent must affect:
  - the system prompt/persona
  - which tools are available for tool calling (capability gating)

### 2. AI SDK Tool Calling (Capability Gating + Schemas)
- The agent runtime must use **Vercel AI SDK tool calling**.
- Each tool must have a **Zod schema** for inputs and outputs.
- Tools must be exposed **only** to the agent(s) that own them:
  - Dumbo: `checkDeadlines`, `groupTasks`, `setReminder`, `prioritizeTasks`, `triggerDance`, `startOxygenTank`
  - Dumby: `summarizePDF`, `summarizeVideo`, `extractHighlights`, `manageQueue`
  - Grimpy: `generateProjectPlan`, `linkStrategyToResources`, `suggestResources`, `groupSimilarTasks`, `sonarPing`, `lateralDrift`
- If a model attempts to call a tool outside its allowed set, the system must reject the call and return a clear error message.

### 3. Shared Guardrails (Limits, Logging, Streaming)
- The system must enforce safety and UX guardrails:
  - cap max nodes/edges created per tool call (configurable)
  - cap max text length written into a node (configurable)
  - cap scanning scope for large boards (configurable; e.g., visible region or selected nodes)
- The system should support **streaming** responses where appropriate.
- Tool calls must be logged with:
  - tool name
  - duration
  - success/failure
  - sanitized parameters (no secrets; redact large payloads like raw PDF text)

### 4. Immediate Apply + Undo (Required)
- Tool-driven mutations must apply **immediately** to the canvas/database.
- Every mutation must be **undoable**:
  - creating nodes/edges
  - moving nodes (grouping/clustering)
  - updating node fields (priority colors, reminders, notes)
  - updating inbox classifications
- Undo should be best-effort and must fail gracefully with a user-facing explanation if full rollback is impossible.

---

## Agent Specs

### Level 1: Dumbo (The Intern)
**Role**: Internal task management, emotional support, and **"Inertia Breaker"**.  
**Vibe**: Eager, high-energy, helpful.  
**System Prompt**:  
“You are Dumbo, an eager Dumbo Octopus intern in the Abyssal Zone. You love helping with small tasks. You speak cheerfully. Your main job is to track deadlines, keep the user happy, and break through inertia. If the user is stressed, offer to dance. If they are stuck, suggest a 'Dive' with the Oxygen Tank.”

#### Dumbo Tools
1. **checkDeadlines** ([Detail](./ai-sdk-tool-check-deadlines.md))
   - Scan all nodes for explicit deadline fields and/or date-like text.
   - Return:
     - overdue tasks list
     - upcoming tasks list
     - per-item parsing confidence and source node id

2. **groupTasks** ([Detail](./ai-sdk-tool-group-tasks.md))
   - Group scattered task nodes into a cluster based on a shared tag.
   - Must preserve existing node content; only positions/cluster metadata change.

3. **setReminder**
   - Add a visual “Alarm” indicator to a node and persist reminder metadata:
     - reminder timestamp
     - timezone (if available)
     - optional reminder label

4. **prioritizeTasks**
   - Analyze tasks and apply a Red/Amber/Green urgency marker.
   - Must include a reason per task (e.g., “due in 2 days”).

5. **triggerDance**
   - Trigger a UI-only bounce animation on the Dumbo mascot (no board mutation required).

6. **startOxygenTank** (The "Inertia Breaker")
   - **Concept**: Standard timers are stressful. Dumbo offers a visual "Air Supply" for deep work.
   - **Mechanism**: A small gauge on the Dumbo card. User sets a "Dive Time" (e.g., 45 mins).
   - **Visuals**: The gauge slowly depletes from Green to Red.
   - **Value**: Visualizes time as a resource (oxygen) rather than a constraint to prevent "time blindness".
   - **Completion**: When it hits 0%, Dumbo shakes to signal "Surface for air!".
   - **Implementation**: Simple `setInterval` reducing width of a CSS bar.

---

### Level 2: Dumby (The Manager)
**Role**: Information processing & resource management.  
**Vibe**: Efficient, literal, structured.  
**System Prompt**:  
“You are Dumby, a mid-level manager octopus. You care about efficiency and data structure. You process heavy information (PDFs, Videos) into clean, actionable summaries. You manage the 'Resource Chamber'.”

#### Dumby Tools
1. **summarizePDF**
   - Accept an uploaded PDF reference.
   - Extract text and create a “Summary Node” with:
     - TL;DR
     - key points
     - action items
     - risks/questions
   - Persist summary and associate it with the source Resource node.

2. **summarizeVideo**
   - Accept a YouTube link.
   - Fetch transcript (or degrade gracefully if unavailable).
   - Create a “Key Takeaways” node; include timestamps when possible.

3. **extractHighlights**
   - Extract key quotes/highlights from a resource and store them in the “Library / Resource Chamber”.
   - Persist source metadata (resource id/type/uri).

4. **manageQueue**
   - Inspect the user’s “Inbox” area and classify items into:
     - Read
     - Watch
     - Do
   - Apply classification via node labels/fields and/or moving nodes to corresponding regions.

---

### Level 3: Grimpy (The Architect)
**Role**: Strategic planning, meta-cognition, and **"Block Buster"**.  
**Vibe**: Cryptic, deep, wise, minimalist.  
**System Prompt**:  
“You are Grimpy, the Ancient Architect of the Deep. You do not deal with trifles. You see the big picture. You connect strategy to execution. You guide the user in planning complex projects, link disparate ideas, and bust through cognitive blocks. When the user is stuck, use Socratic questioning or lateral thinking.”

#### Grimpy Tools
1. **generateProjectPlan**
   - Input: a vague goal (optionally: deadline, constraints, context).
   - Output: spawn a node template:
     - Divergent (explore options) or Convergent (execute steps)
   - Must include clear, concrete step labels and dependency ordering.
   - Must respect node/edge creation limits.

2. **linkStrategyToResources**
   - Identify a Goal node and relevant Resource/Library nodes.
   - Create edges between the goal and resources with a meaningful label (e.g., “reference”, “requirements”, “research”).
   - Must avoid duplicate edges.

3. **suggestResources**
   - Query the web (search provider) for relevant links/tools.
   - Create nodes for suggested resources with short annotations and provenance notes.
   - Must cap number of suggestions per call.

4. **groupSimilarTasks**
   - Semantically analyze tasks on the board and cluster/connect related nodes.
   - Must avoid re-grouping already clustered items unless it improves grouping measurably.

5. **sonarPing** (The Void Mirror)
   - **Concept**: Reflection over answers. Socratic questioning to force deeper engagement.
   - **Action**: Input a selected node's content; Grimpy generates a challenging, reflective question (e.g., "What is the single highest risk to this strategy?").
   - **Value**: Breaks "Writer's Block" by forcing the brain to engage deeper.

6. **lateralDrift** (Oblique Strategies)
   - **Concept**: Sparking creativity via randomness and divergent thinking.
   - **Action**: Identify a random node from a distant part of the canvas and connect it to the current active node with a dashed line labeled "Synthesis?".
   - **Value**: Mimics subconscious creativity by colliding two unrelated concepts.

## Data Requirements

### Stored Node Data (Existing + Extensions)
- Reuse existing node fields where possible; extend with:
  - `dueDate` (optional, if not already present)
  - `priority` or `priorityColor` (Red/Amber/Green)
  - `reminderAt`, `reminderLabel` (optional)
  - `inboxStatus` (Inbox/Read/Watch/Do)
  - `createdByAgent` (Dumbo/Dumby/Grimpy) for auditability (optional)

### Resource Chamber (Database Table)
- Persist extracted highlights and summaries:
  - source type (pdf/video/web)
  - source uri / blob url
  - title
  - highlights
  - summary (markdown and/or json)

### Edges/Links (If Applicable)
- Store labeled edges between nodes:
  - `fromNodeId`
  - `toNodeId`
  - `label`
  - `createdByAgent` (optional)

## User Flow

### A. Choose Agent + Ask for Help
1. User opens agent picker.
2. User selects Dumbo, Dumby, or Grimpy.
3. User types a prompt or selects a relevant node(s).
4. Agent responds and calls tools as needed.
5. Board updates apply immediately.
6. User can Undo if desired.

### B. Resource Ingestion (Dumby)
1. User attaches a PDF (or provides a YouTube link) to a Resource node.
2. User selects Dumby and asks for summarization/highlights.
3. Dumby creates summary/takeaways nodes and persists highlights into the Resource Chamber.

### C. Project Planning (Grimpy)
1. User selects or references a Goal node (“Launch App”).
2. User selects Grimpy and asks for a plan (Divergent or Convergent).
3. Grimpy spawns a structured plan template and connects related resources/tasks.

## Acceptance Criteria
1. ✅ The user can manually select Dumbo/Dumby/Grimpy and the system uses the correct persona + tool set.
2. ✅ Each tool call validates inputs/outputs with Zod schemas.
3. ✅ Tools cannot be called by unauthorized agents (capability gating enforced).
4. ✅ Tool-driven board mutations apply immediately and are undoable.
5. ✅ Dumbo can detect deadlines, prioritize tasks, set reminders, group tasks by tag, and manage the Oxygen Tank timer.
6. ✅ Dumby can produce a structured PDF summary and video takeaways and persist highlights in the Resource Chamber.
7. ✅ Grimpy can generate a project plan template, link goals to relevant resources, perform Sonar Pings (questions), and trigger Lateral Drifts (random synthesis).
8. ✅ Errors (missing transcript, OCR failure, model/tool errors) produce clear user-facing messages and do not corrupt board state.

## Edge Cases
- **Ambiguous dates** (“next Friday”, “11/12”): store parsing confidence; do not overwrite explicit deadlines unless requested.
- **Large boards**: limit scan scope; support partial scans (selected nodes / visible region).
- **Duplicate grouping/linking**: avoid creating duplicate clusters or edges.
- **Transcript unavailable**: request a pasted transcript; create a placeholder node with status if needed.
- **OCR failures**: show a clear error and allow retry without losing the uploaded file.
- **Rate limits/timeouts**: graceful backoff and user-facing retry prompts.

## Non-Functional Requirements (Optional)
- **Performance**: enforce conservative limits on scanning and node creation to keep interactions fast.
- **Security**: tool calling runs server-side; never expose secrets; sanitize logs.
- **UX**: agents must report “what changed” after tool calls (nodes created/updated/moved).


