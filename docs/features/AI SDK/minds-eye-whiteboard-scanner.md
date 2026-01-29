# Feature Requirement Document: Mind’s Eye (Grimpy) — Whiteboard/Image Scanner (AI SDK)

## Feature Name
Mind’s Eye (Grimpy) — Whiteboard/Image Scanner (AI SDK)

## Goal
Allow users to turn an **image** (from a `media` or `lightbox` node) into a structured **project plan** on the canvas using **Vercel AI SDK `generateObject`** with a **vision-capable** model.

The generated plan must be:
- structured (schema-validated),
- easy to apply to the canvas (Strategy + Tactics nodes + edges),
- deterministic in layout and styling.

## User Story
As a user, I want to select a photo/lightbox image of a sketch and have Grimpy convert it into a Strategy and a set of Tactical tasks on my board, so that I can quickly transform rough planning into an executable project plan.

## Functional Requirements

### 1) Input Source (Canvas Image Nodes)
- Mind’s Eye must be triggerable from:
  - `media` nodes when `data.imageUrl` exists
  - `lightbox` nodes when `data.imageUrl` exists
- If the node does not have an image, the UI must disable the trigger and explain why.

### 2) API Call (Backend Vision)
- The frontend must send a **base64 image string** to:
  - `POST /api/grimpy/analyze-sketch`
- The backend must:
  - require authentication
  - validate input
  - call `generateObject({ model: <selected-model>, schema, messages })` with the user-selected model
  - return the validated JSON object

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

### 3) Output Schema (Blueprint)
The backend output must match:
- `strategy`: `{ title: string, description: string }`
- `tactics`: `Array<{ title: string, dueInDays: number }>`
- `summary`: `string`

### 4) Canvas Mapping (React Flow)
When the frontend receives the JSON, it must map to React Flow:
- **Strategy node**:
  - y: `0`
  - color: `#ef4444` (red)
- **Tactic nodes**:
  - y: `300`
  - x spacing: `index * 250`
  - color: `#22d3ee` (cyan)
  - store `dueInDays` in the node `notes` (e.g. `Due in 7 days`)
- **Edges**:
  - connect the Strategy node to every Tactical node

### 5) UX & Error Handling
- Show a modal with:
  - image preview
  - provider/model selection dropdown
  - "Analyze" action
  - loading state while the model runs
  - error message on failure (auth missing, invalid image, provider error)
- The board must not be mutated on failure.

## Data Requirements (Reuse Existing Types)
- Reuse `GrimpoNodeData`:
  - `title`, `notes`, `status`, `color`
- No new DB tables are required for v1.

## User Flow
1. User uploads an image into a `media` node or adds a tracing image in a `lightbox` node.
2. User clicks **Mind’s Eye**.
3. A modal opens showing a preview and an **Analyze** button.
4. The app sends the image to `/api/grimpy/analyze-sketch`.
5. The app receives `{ strategy, tactics, summary }`.
6. The app creates:
   - 1 Strategy node
   - N Tactical nodes
   - N edges from Strategy → each Tactical
7. The modal shows the summary and can be closed.

## Acceptance Criteria
- ✅ Mind’s Eye can be triggered from `media`/`lightbox` nodes that have `imageUrl`.
- ✅ Backend route requires auth and returns `401` when not signed in.
- ✅ Backend validates request body and returns `400` for missing/invalid `base64Image`.
- ✅ Backend uses the selected model and `generateObject` with the defined Zod schema.
- ✅ Frontend correctly maps the returned plan into nodes/edges with required positions/colors.
- ✅ `dueInDays` is stored in tactic node `notes` (and not in `deadline`).
- ✅ Failures show clear errors and do not corrupt canvas state.

## Edge Cases
- Image URL fetch fails (CORS/network): show “Could not load image for analysis.”
- Very large images: reject client-side or server-side with a clear message.
- Model returns inconsistent data: schema validation fails and user receives an error message.
- Empty/blank sketch: model may return vague tactics; still must validate schema.

## Non-Functional Requirements (Optional)
- Performance: keep payload sizes reasonable; cap base64 size.
- Security: do not log raw base64 images; do not expose secrets to the client.

