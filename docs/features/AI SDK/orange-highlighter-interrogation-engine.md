# Feature Requirement Document (FRED): Dumby's "Orange Highlighter" & Interrogation Engine

## Feature Name
Dumby's "Orange Highlighter" & Interrogation Engine

## Goal
Enhance the "Resource Chamber" PDF experience by moving beyond a simple iframe preview to a production-grade, interactive PDF reader managed by Dumby (The Manager). This feature allows users to highlight text in PDFs to save it, transform it into tasks, or perform AI-driven interrogation (explanation or critique).

## User Story
As a knowledge worker, I want to interactively highlight text in my research documents so that I can capture key insights, generate action items directly on my canvas, and ask Dumby to explain complex jargon or critique claims in real-time.

## Functional Requirements

### 1. Persistent Highlights (Phase 1)
- **Database Storage**: Store highlights in a new Neon Postgres table called `highlights`.
- **Fields**:
  - `id`: UUID (Primary Key).
  - `node_id`: UUID (Foreign Key linking to the Canvas Node ID).
  - `content`: Text (The highlighted text snippet).
  - `comment`: Text (Optional user notes).
  - `position`: JSONB (Stores `{ boundingRect, rects, pageNumber }` for rendering).
  - `created_at`: Timestamp.
- **Migration**: Update `src/db/schema.ts` and push changes to Neon.

### 2. Intelligent Interrogation API (Phase 2)
- **Endpoint**: `/api/chat/dumby-interrogate`
- **AI Engine**: Vercel AI SDK with `streamText`.
- **System Prompt**:
  - Persona: Dumby, an efficient Knowledge Manager.
  - Intent 'EXPLAIN': Simplify jargon (ELIF5).
  - Intent 'CRITIQUE': Check for logical fallacies and vague language.
  - Intent 'GENERAL': Answer specific questions about the snippet.
- **Input**: Message, highlighted text context, and intent.

### 3. DumbyReader Component (Phase 3)
- **Layout**: 70/30 Split Screen Modal.
- **Left Pane (70%)**: PDF Viewer using `react-pdf-highlighter`.
  - Configured with PDF.js worker.
  - Visuals: `bg-slate-900`, Orange highlights (`rgba(249, 115, 22, 0.4)`), Orange selection cursor.
  - Data: Loads and renders highlights for the specific `nodeId` on mount.
- **Right Pane (30%)**: "Dumby Chat" interface.
  - Adaptation of the AI assistant chat UI.
  - Header: "DUMBY_ANALYSIS_PROTOCOL" in Orange font.
  - Background: Deep Orange/Slate Gradient (`bg-gradient-to-b from-orange-950/30 to-slate-900`).

### 4. Interactive Context Menu (Phase 4)
- Triggered on text selection in the PDF viewer.
- **Options**:
  - 🟠 **Explain This**: Sends text to Dumby Chat with `EXPLAIN` intent.
  - ✅ **Extract Task**: Triggers a callback to spawn a new Node on the React Flow canvas with the selected text as the label.
  - ❓ **Critique / Interrogate**: Sends text to Dumby Chat with `CRITIQUE` intent.

### 5. Integration (Phase 5)
- **Media/Resource Node**: Add `onDoubleClick` handler to open `DumbyReader` in a full-screen modal.
- **Props**: Pass `nodeId` and `url` to the reader.
- **Callback**: Implement `onExtractTask` to create new nodes near the source node on the canvas.

## Data Requirements
- **New Table**: `highlights` in Neon Postgres.
- **Relationship**: Many-to-one relationship with `canvases` (via `node_id` inside the nodes JSON or as a separate entity if nodes are normalized). *Note: Currently nodes are stored as JSONB in `canvases` table, so `node_id` in `highlights` refers to the ID within that JSON.*

## User Flow
1. User double-clicks a Resource/Media node containing a PDF.
2. `DumbyReader` modal opens, loading the PDF and any existing highlights.
3. User selects a paragraph in the PDF.
4. An orange pop-over menu appears with "Explain", "Extract Task", and "Critique".
5. User clicks "Explain This".
6. The right pane (Dumby Chat) streams an ELI5 explanation of the selected text.
7. User selects another sentence and clicks "Extract Task".
8. The modal closes (or remains open) and a new task node appears on the main canvas containing the text.

## Acceptance Criteria
- [ ] `highlights` table exists in Neon with correct schema.
- [ ] Double-clicking a PDF resource opens the 70/30 split reader.
- [ ] Text highlights persist across sessions and reloads.
- [ ] Context menu appears on selection with the 3 required actions.
- [ ] Dumby Chat streams responses based on the selected intent.
- [ ] "Extract Task" correctly creates a new node on the React Flow canvas.
- [ ] Visual style matches the Abyssal/Orange "Dumby" theme.

## Edge Cases
- **Empty PDF**: Handle PDFs that fail to load or have no text content.
- **Overlapping Highlights**: `react-pdf-highlighter` should handle or allow overlapping selections.
- **Database Offline**: Show a graceful error if highlights cannot be saved or fetched.
- **Long Text Selection**: Truncate context sent to AI if it exceeds token limits.

## Non-Functional Requirements
- **Performance**: PDF rendering and highlighting should be smooth even for large documents.
- **UX**: The transition between the canvas and the reader should feel seamless (e.g., using Framer Motion for the modal).


