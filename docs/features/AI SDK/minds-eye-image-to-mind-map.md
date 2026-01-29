# Feature Requirement Document: Mind’s Eye (Grimpy) — Image → Mind Map (AI SDK)

## Feature Name
Mind’s Eye (Grimpy) — Image → Mind Map (AI SDK)

## Goal
Enable users to convert an **image** (from a `media` or `lightbox` node) into a structured **mind map** on the canvas, using **Vercel AI SDK** structured output and a **new React Flow node type** (`mindmap`) with purpose-built rendering and layout.

This complements the existing Mind’s Eye “project plan” flow (Strategy + Tactics) by offering a **visual brainstorming / concept-map** representation.

## User Story
As a user, I want to click a dedicated “Mind Map” action on an image node and have Grimpy generate a mind map from the sketch/photo, so that I can brainstorm and organize concepts spatially on the canvas.

## Functional Requirements

### 1) Trigger UX (Separate Action)
- The app must expose a **separate button/action** for “Mind Map” on:
  - `media` nodes when `data.imageUrl` exists
  - `lightbox` nodes when `data.imageUrl` exists
- The action must be disabled (with a helpful tooltip) if there is no image.

### 2) Input
- The client must send a **base64 image** string to a backend route dedicated to mind map generation, OR reuse the existing Mind's Eye analyzer with a `mode`/`intent` flag.
- The request must support switching between multiple AI models (consistent with existing AI SDK options).

#### Supported Providers & Models
The model selection must include these models:

##### Google (Gemini)
- `gemini-2.5`
- `gemini-3.0-flash`

##### OpenAI
- `gpt-4o`
- `gpt-4o-mini`

##### OpenRouter (or equivalent aggregator)
- `xiaomi/mimo-v2-flash`
- `allenai/molmo-2-8b:free`

### 3) Output Schema (Mind Map)
The backend must return a schema-validated object representing a mind map:
- `root`: `{ title: string }`
- `nodes`: array of nodes:
  - `{ id: string, title: string }`
- `edges`: array of relationships:
  - `{ fromId: string, toId: string, label?: string }`
- `summary`: `string`

Notes:
- `id` values must be stable within the returned object (unique within `nodes`).
- Output should be compact; avoid overly deep recursion for v1 (prefer a flat node list + explicit edges).

### 4) Canvas Representation (New Node Type)
- Add a new React Flow node type: **`mindmap`**.
- A `mindmap` node must visually render:
  - A **root** title (center)
  - A set of **child nodes** arranged radially or as a tidy tree layout inside the node container
  - Connection lines between mind-map items (inside the node), *or* use standard React Flow edges between embedded “subnodes” (implementation choice).
- The mind map must be created as **one `mindmap` node** on the canvas (not dozens of separate Strategy/Tactical nodes).
- The node must be resizable and readable at typical zoom levels.

### 5) Apply/Undo Behavior
- Applying a mind map must be a single, atomic canvas mutation:
  - Create one `mindmap` node (and optionally associated edges if needed).
- Undo should remove the created `mindmap` node (and associated edges if any).

### 6) Error Handling
- If analysis fails, show a clear error message and do not mutate the board.
- Handle missing auth/API keys similarly to other AI routes.

## Data Requirements

### Node Data
Extend `NodeKind` and node type mapping to include:
- `mindmap` node type

Proposed persisted data shape on the node:
- `title`: string (root title)
- `notes?`: optional summary
- `mindmap`: the structured object returned by the backend (root/nodes/edges)
- optional visual settings (layout style, colors) as needed

No new database tables required for v1; rely on existing project graph persistence.

## User Flow
1. User uploads an image into a `media` node or sets a tracing image in a `lightbox` node.
2. User clicks the **Mind Map** action.
3. A modal opens with a preview + provider/model selection and an **Analyze** button.
4. The backend returns a schema-validated mind map.
5. User clicks **Apply**.
6. The app creates a single `mindmap` node on the canvas (anchored near the source image).

## Acceptance Criteria
- ✅ “Mind Map” is available as a separate action on `media` and `lightbox` image nodes.
- ✅ The backend returns a schema-validated mind map object.
- ✅ The user can switch between supported AI models for this operation.
- ✅ Applying creates a new `mindmap` node with a readable layout of the mind map content.
- ✅ Errors do not mutate the canvas and are clearly displayed.

## Edge Cases
- Very noisy/handwritten images: output may be partial; still must validate schema.
- Too many nodes: enforce a max node count and ask the model to compress.
- Cycles in edges: renderer must handle gracefully (or disallow via schema constraints).
- Missing image URL / fetch failure: show “Could not load image for analysis.”

## Non-Functional Requirements (Optional)
- Performance: cap image/base64 size; cap mind map node count.
- UX: maintain readability at zoomed-out views (simplified rendering).
- Security: don’t log base64 image content; keep model calls server-side.

