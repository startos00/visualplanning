# Feature Requirement Document: Resource Card Media (PDF + Video)

## Feature Name
Resource Card Media (PDF + Video)

## Goal
Let users attach and **visualize media** (PDFs and videos) directly inside a **Resource card**, while staying within the project’s constraints: **no backend, no database, and minimal time**. The feature should be “good enough” for a visual demo and deep-work reference, not a production asset manager.

## User Story
As a user building a visual strategy/work map, I want to add a PDF or a video link to a Resource card and preview it, so that I can quickly reference supporting material without leaving the workspace.

## Functional Requirements

1. **Media Types Supported**
   - The Resource card must support attaching:
     - **PDF**
     - **Video link** (e.g., YouTube/Vimeo/Loom or a direct `.mp4` URL)

2. **Attach by URL (MVP)**
   - The Resource card must allow users to paste a **PDF URL** and/or a **Video URL**.
   - The app must store these URLs in the existing persisted graph state (currently `localStorage`).
   - The card must display a **Preview** area when a valid URL is present:
     - PDF: attempt to render in an embedded viewer (e.g., `<iframe>`), with a clear fallback: “Open PDF in new tab”.
     - Video: attempt to embed if it’s a supported provider (YouTube/Vimeo/Loom), with a fallback link to open externally.

3. **Optional: “Upload PDF (Preview Only)” (Hacky but Helpful)**
   - The Resource card may provide an “Upload PDF” button that lets the user pick a local PDF.
   - On upload, the app must generate a **temporary preview** (via browser object URL) so the user can visualize it immediately.
   - The app must clearly label this as **not persistent** (will disappear on refresh) unless a URL is also saved.
   - The app must not attempt to store the PDF file bytes in `localStorage`.

4. **UX Behavior in Different Zoom Levels / Modes**
   - When zoomed out (strategy mode), the media preview must be hidden/collapsed to avoid clutter.
   - When zoomed in (tactical mode), the preview should be available.
   - The preview area must not block basic node interactions (dragging, connecting).

5. **Edit / Remove**
   - Users must be able to:
     - Add media (paste URL and save)
     - Replace media (change URL)
     - Remove media (clear URL)

## Data Requirements (No Backend)

### Persisted data (stored in `localStorage` with the rest of the graph)
- Resource node data must be extended to store:
  - **pdfUrl** (string, optional)
  - **videoUrl** (string, optional)
  - Optional: a **preferredPreview** field (e.g., `"pdf"` or `"video"`) if both exist

### Non-persisted data (ephemeral, in-memory only)
- If implementing “Upload PDF (Preview Only)”:
  - Temporary object URL / selected file name for the current session only

### Storage constraints (explicit)
- The solution must avoid storing PDF bytes as base64 in `localStorage` because:
  - `localStorage` has small limits (often ~5–10MB total) and is easy to exceed.
  - Base64 inflates size and can break saving for the entire workspace.

## User Flow

### Attach PDF via URL (MVP)
1. User creates or selects a Resource node.
2. User pastes a PDF link into “PDF URL”.
3. User sees a PDF preview (if embeddable) or a clear “Open in new tab” fallback.
4. User refreshes the page later and the link still exists (persisted).

### Attach Video via URL (MVP)
1. User pastes a YouTube/Vimeo/Loom link into “Video URL”.
2. The card shows an embedded player if supported, otherwise a link to open externally.
3. Link persists across refreshes.

### Upload PDF (Preview Only) (Optional)
1. User clicks “Upload PDF (Preview Only)” and selects a file.
2. The card displays the PDF preview immediately.
3. User refreshes the page and the uploaded preview is gone unless they also added a URL.

## Acceptance Criteria

1. ✅ A Resource card supports saving a **PDF URL** and **Video URL** and persists them via existing storage.
2. ✅ When a PDF URL is present, the UI offers an embedded preview when possible and always offers “Open in new tab”.
3. ✅ When a video URL is present, the UI attempts an embed for common providers (at least YouTube) and otherwise offers an external link.
4. ✅ Users can remove media by clearing the URL fields.
5. ✅ The workspace remains stable even if users add large/long URLs; the feature must not store binary media in `localStorage`.
6. ✅ Previews are hidden/collapsed when zoomed out (strategy mode) to keep the canvas clean.

## Edge Cases

1. **Embeds blocked by the host**
   - Some PDF/video hosts block embedding (CORS / `X-Frame-Options`).
   - The UI must gracefully fall back to “Open in new tab” without errors.

2. **Invalid or unsupported URLs**
   - If a URL is invalid, show a small inline message and keep the field editable.

3. **YouTube URL formats**
   - Support common formats (`watch?v=...`, `youtu.be/...`) by converting to an embed URL.

4. **Large PDFs**
   - If embedding is slow, user can still open the PDF in a new tab.

5. **Storage full / blocked**
   - If `localStorage` writes fail (quota/private mode), the feature should fail silently like the rest of persistence does today, and the UI should not crash.

## Non-Functional Requirements

1. **Time-to-Implement**
   - MVP should be implementable quickly without introducing a backend or new complex libraries.

2. **Performance**
   - Avoid heavy PDF rendering libraries in the MVP (no `pdf.js` requirement).
   - Embedded previews should be opt-in/limited in size to prevent jank.

3. **Security / Safety**
   - URLs must be treated as untrusted input:
     - Use safe embed patterns and restrict iframe capabilities (e.g., `sandbox` where reasonable).
     - Avoid injecting raw HTML.

4. **Beginner-Friendly**
   - Implementation should use existing React patterns in the project (simple inputs + callbacks).

## Technical Notes (Implementation Guidance)

### Recommended MVP approach (fastest, most robust)
- **PDF**: store `pdfUrl` and render:
  - Try `<iframe src={pdfUrl}>` preview
  - Always show “Open in new tab”
- **Video**: store `videoUrl` and render:
  - If YouTube link → compute embed URL and render an `<iframe>`
  - Otherwise show “Open video” link

### Optional “Upload PDF (Preview Only)”
- Use `URL.createObjectURL(file)` for preview.
- Do not persist the file bytes; keep only in component state.

## Trade-Offs (What you’re choosing between)

1. **URL-only (Recommended MVP)**
   - Pros: persists, simple, no storage risk, no backend.
   - Cons: requires the media to live somewhere accessible (Drive/Dropbox/public URL/etc.); embeds sometimes blocked.

2. **Local PDF upload preview-only**
   - Pros: instant visualization with no external hosting.
   - Cons: not persistent across refresh; still “good for demo”.

3. **Store PDFs in-browser persistently (IndexedDB)**
   - Pros: no backend, persistent binary storage possible.
   - Cons: more code/complexity; higher risk vs the project time constraints; out of MVP scope.

## Future Enhancements (Out of Scope)
- Persistent local file storage via IndexedDB.
- Multiple attachments per Resource card.
- Rich previews (PDF page thumbnails, timestamped video notes).
- Import/export bundling of media.


