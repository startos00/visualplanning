# Role-Specific Thinking Templates (Richer Divergent/Convergent)

## Feature Name
Role-Specific Thinking Templates (Richer Divergent/Convergent)

## Goal
Make the **Divergent (Explorer)** and **Convergent (Builder)** spawns feel meaningfully different per role by generating **role-tailored node sets** (and, when appropriate, mixed node types like `resource`, `strategy`, `tactical`) that reflect how each role typically thinks and works.

This reduces blank-canvas friction and nudges users into a role-appropriate workflow (e.g., Architect: collect research → write brief/strategy → plan tasks → execute).

## User Story
As a user (General, Designer/Architect, Scientist/Academic, Founder, Engineer), I want Divergent/Convergent templates that match my role’s natural workflow so that I can start with the right structure and move from exploration to execution faster.

## Functional Requirements

### FR1 — Template Availability
- The system provides **exactly 2 templates per role**:
  - **Divergent (Explorer)**
  - **Convergent (Builder)**
- **Blank canvas** remains a no-op (spawns nothing).

### FR2 — Existing UI Contract Remains
- No new UI controls are required.
- The existing `TemplateSpawner` keeps the same three options:
  - Blank canvas
  - Divergent (Explorer)
  - Convergent (Builder)
- Selecting Divergent/Convergent spawns the role-specific template for the selected role.

### FR3 — Node Types and Semantics
- Nodes may be any existing `NodeKind`:
  - `strategy`: framing, brief, hypotheses, architecture, value proposition, etc.
  - `tactical`: tasks / execution steps (should default to `status: "todo"`)
  - `resource`: documents, links, references, datasets (should default to empty `link/pdfUrl/videoUrl` unless provided)

### FR4 — Layout (Hardcoded Coordinates; No Layout Library)
- Templates use hardcoded relative coordinates anchored at the **current viewport center** (same anchoring logic as current spawner).
- The layout must be deterministic and readable:
  - Nodes should not overlap at default zoom.
  - Edges should clarify flow (exploration relationships for Divergent; sequence/pipeline for Convergent).

### FR5 — Append-Only + Unique IDs
- Spawning must **append** nodes/edges (do not delete/replace existing graph).
- Every spawned node/edge must have a unique ID, safe for rapid multi-spawns.

### FR6 — Role-Specific Content (Template Definitions)
Below are the required node titles and structure per role. (Notes can be empty strings by default unless specified.)

**Research cards requirement**:
- Every role’s **Divergent** and **Convergent** template must include **at least one `resource` node** intended for research/docs/links.
- Templates should include **additional `resource` nodes where natural** for the role (papers/datasets for scientists, runbooks/docs for engineers, transcripts/market evidence for founders, etc.).

#### A) General
- **Divergent** (richer exploration; mixed, 11 nodes):
  - Center (`strategy`): "Main Topic"
  - Surrounding (`strategy`): "Sub-Idea A", "Sub-Idea B", "Sub-Idea C", "Sub-Idea D"
  - Surrounding (`strategy`): "Constraints", "Stakeholders", "Success Criteria"
  - Surrounding (`resource`): "Reference / Link", "Examples / Inspiration"
  - Edges: Center → all surrounding nodes
- **Convergent** (richer execution; 8 nodes):
  - (`strategy`): "Goal / Outcome"
  - (`resource`): "Requirements / Context"
  - (`resource`): "Research / Notes"
  - (`strategy`): "Plan"
  - (`tactical`): "Task List (tasks)"
  - (`tactical`): "Blockers / Risks (tasks)"
  - (`tactical`): "Execution Sprint (tasks)"
  - (`strategy`): "Review / Next Iteration"
  - Edges: Goal → Requirements → Research → Plan → Task List → Blockers → Execution → Review

#### B) Designer/Architect
- **Divergent** (richer; “inspiration + references + constraints + options”, 11 nodes):
  - Center (`strategy`): "Design Direction"
  - Surrounding (`resource`): "Reference 1", "Reference 2", "Competitors / Comparables"
  - Surrounding (`resource`): "Patterns / Design System References"
  - Surrounding (`strategy`): "User Needs", "Constraints", "Design Principles", "Moodboard Keywords"
  - Surrounding (`strategy`): "Concept Option A", "Concept Option B"
  - Edges: Direction → all surrounding nodes
- **Convergent** (richer pipeline; “research → brief → system → execution”, 9 nodes):
  - (`resource`): "User/Domain Research"
  - (`resource`): "Requirements / Docs"
  - (`strategy`): "Brief / Strategy"
  - (`strategy`): "Information Architecture / System"
  - (`resource`): "Design System / Tokens"
  - (`tactical`): "Wireframes (tasks)"
  - (`tactical`): "Prototype (tasks)"
  - (`tactical`): "Critique + Iterate (tasks)"
  - (`tactical`): "Ship + Measure (tasks)"
  - Edges: Research → Requirements → Brief → IA/System → Design System → Wireframes → Prototype → Critique → Ship

#### C) Scientist/Academic
- **Divergent** (richer; “question + literature + data + methods + assumptions”, 11 nodes):
  - Center (`strategy`): "Research Question"
  - Surrounding (`resource`): "Key Papers / Prior Work", "Related Work Map", "Dataset(s)"
  - Surrounding (`resource`): "Lab Notes / Notebook"
  - Surrounding (`strategy`): "Variables", "Methods", "Threats to Validity", "Assumptions"
  - Surrounding (`strategy`): "Expected Outcomes", "Open Questions"
  - Edges: Question → all surrounding nodes
- **Convergent** (richer pipeline; “hypothesis → design → prereg → execute → analyze → write”, 11 nodes):
  - (`strategy`): "Hypothesis"
  - (`strategy`): "Experimental Design"
  - (`resource`): "Protocol / Pre-Registration"
  - (`resource`): "Dataset(s) / Materials"
  - (`resource`): "Code / Notebook"
  - (`tactical`): "Instrument / Setup (tasks)"
  - (`tactical`): "Data Collection (tasks)"
  - (`tactical`): "Analysis (tasks)"
  - (`strategy`): "Results Summary"
  - (`tactical`): "Write-up (tasks)"
  - (`strategy`): "Conclusion / Next Questions"
  - Edges: Hypothesis → Design → Protocol → Dataset → Code → Setup → Collect → Analyze → Results → Write-up → Conclusion

#### D) Founder
- **Divergent** (richer; “discovery + competitive + positioning + channels”, 14 nodes):
  - Center (`strategy`): "Value Proposition"
  - Surrounding (`strategy`): "ICP (Ideal Customer)", "Job To Be Done", "Pain Points", "Solution Ideas"
  - Surrounding (`strategy`): "Differentiation", "Pricing Hypotheses", "Distribution Channels"
  - Surrounding (`resource`): "Competitors", "Competitive Matrix", "Market Evidence / Links", "Interview Transcripts / Notes"
  - Surrounding (`strategy`): "Risks / Unknowns", "Moat / Advantage"
  - Edges: Value Prop → all surrounding nodes
- **Convergent** (richer pipeline; “test → decide → build → launch → learn”, 12 nodes):
  - (`strategy`): "Assumptions to Test"
  - (`resource`): "Competitor Notes / Links"
  - (`tactical`): "Interview Script (tasks)"
  - (`tactical`): "Customer Interviews (tasks)"
  - (`resource`): "Evidence / Notes"
  - (`strategy`): "Insights + Decision"
  - (`strategy`): "MVP Scope"
  - (`tactical`): "Build MVP (tasks)"
  - (`tactical`): "Launch (tasks)"
  - (`resource`): "Metrics / Dashboard"
  - (`tactical`): "Measure (tasks)"
  - (`strategy`): "Iterate / Pivot"
  - Edges: Assumptions → Competitors → Script → Interviews → Evidence → Insights → Scope → Build → Launch → Metrics → Measure → Iterate

#### E) Engineer
- **Divergent** (richer; “architecture + interfaces + risks + observability”, 14 nodes):
  - Center (`strategy`): "System Architecture"
  - Surrounding (`strategy`): "Frontend", "Backend", "Database", "DevOps"
  - Surrounding (`strategy`): "Data Model", "APIs / Contracts", "Performance Risks", "Security Risks"
  - Surrounding (`strategy`): "Observability", "Dependencies"
  - Surrounding (`resource`): "Existing Docs / ADRs", "Metrics / Logs", "Docs / Links"
  - Edges: Architecture → all surrounding nodes
- **Convergent** (richer pipeline; “spec → design → implement → test → release → operate”, 12 nodes):
  - (`strategy`): "Spec"
  - (`strategy`): "Technical Design"
  - (`resource`): "RFC / ADR"
  - (`resource`): "API Docs"
  - (`tactical`): "Implement (tasks)"
  - (`tactical`): "Code Review (tasks)"
  - (`tactical`): "Test (tasks)"
  - (`tactical`): "Deploy (tasks)"
  - (`resource`): "Runbook / Ops Notes"
  - (`tactical`): "Monitor + Alerting (tasks)"
  - (`strategy`): "Postmortem / Learnings"
  - (`strategy`): "Backlog / Next Iteration"
  - Edges: Spec → Design → RFC → API Docs → Implement → Review → Test → Deploy → Runbook → Monitor → Learnings → Backlog

### FR7 — Backward Compatibility
- If any role template definition changes, existing saved graphs must continue to load normally.

## Data Requirements (Optional)
- No new storage is required.
- Spawned nodes/edges persist via existing local persistence.
- Role selection state remains non-persisted unless explicitly requested later.

## User Flow
1. User opens the canvas (blank or persisted state).
2. User selects a role in the top-center pill.
3. User selects Divergent or Convergent.
4. System spawns the role-specific template anchored at viewport center.
5. User edits node titles/notes, adds links to resource nodes, and executes tasks.

## Acceptance Criteria
- For each role, Divergent/Convergent spawns the exact node titles and node kinds listed in **FR6**.
- Templates are **append-only**, with no ID collisions across rapid multiple spawns.
- Spawn is anchored at the **current viewport center**.
- Blank canvas spawns nothing.
- No overlaps that make nodes unreadable at default zoom (basic spacing is sufficient).

## Edge Cases
- Rapid repeated spawns: IDs remain unique.
- Zoomed/panned viewport: anchor uses visible center.
- Early init (no `screenToFlowPosition`): anchor defaults to `{ x: 0, y: 0 }`.
- If a role definition is missing (should not happen), fallback to **General** templates.

## Non-Functional Requirements (Optional)
- Keep templates reasonably sized (≤ 12 nodes recommended) to avoid clutter.
- Keep styling consistent; no layout libs; hardcoded coordinates only.


