# Feature Requirement Document: PDF Summarisation (AI SDK)

## Feature Name
PDF Summarisation (AI SDK)

## Goal
Let a signed-in user **upload a PDF** on a Resource card and generate a **structured summary** using **Vercel AI SDK** (provider configurable: **Anthropic** or **Google Gemini**), with support for **scanned PDFs via OCR**, and **persist** both the PDF and the summary.

## User Story
As a user, I want to upload a PDF to a Resource card and click “Summarise”, so that I can quickly understand the document and keep a saved summary inside my workspace.

## Functional Requirements
1. **Upload PDF (Persisted)**
   - The Resource card must allow uploading a local PDF file.
   - The uploaded PDF must be stored in remote storage and a stable `pdfUrl` must be persisted.
   - Upload must require an authenticated session.

2. **Summarise PDF**
   - The Resource card must provide a “Summarise” action once a PDF exists (via uploaded PDF URL).
   - The summary must be produced by an LLM using Vercel AI SDK (Anthropic or Google Gemini, configured via environment variables).
   - The summary output must include:
     - TL;DR
     - Key points
     - Action items
     - Risks / questions

3. **OCR Support**
   - The summarisation pipeline must support scanned/image PDFs.
   - The system must attempt to extract text via OCR when needed.

4. **Persist Summary**
   - The generated summary must be stored in the database, associated with:
     - the authenticated user
     - the Resource node id
     - the stored PDF URL / filename
   - The summary must also be written into the Resource card’s `notes` field for immediate in-canvas use.

5. **Progress + Errors**
   - The UI must show progress states: uploading → OCR → summarising.
   - If the user is not authenticated, the UI must clearly indicate sign-in is required.
   - If OCR fails, the UI must show a clear error and allow retry.

## Data Requirements
### Database
- Add a `pdf_summaries` table with:
  - `id` (uuid)
  - `user_id` (text, FK to `users.id`)
  - `node_id` (text)
  - `pdf_blob_url` (text)
  - `pdf_filename` (text)
  - `summary_markdown` (text)
  - `summary_json` (jsonb, optional)
  - `created_at`, `updated_at`
- Enforce uniqueness for `(user_id, node_id)` so a node’s summary can be updated.

### Stored Node Data
- Reuse existing Resource node fields:
  - `pdfUrl` (string)
  - `notes` (string)

### Storage
- Store the PDF binary in a blob store (Vercel Blob).

## User Flow
1. User creates/selects a Resource card.
2. User clicks “Upload PDF” and selects a local PDF file.
3. The PDF uploads and the card preview uses the persisted `pdfUrl`.
4. User clicks “Summarise”.
5. App extracts text (PDF text extraction + OCR as needed).
6. App sends extracted text to the summarisation API.
7. App shows a structured summary and saves it to:
   - Resource card notes
   - `pdf_summaries` DB row

## Acceptance Criteria
1. ✅ A signed-in user can upload a PDF from a Resource card and the `pdfUrl` persists.
2. ✅ Clicking “Summarise” generates a structured summary (TL;DR, key points, actions, risks).
3. ✅ The summary appears in the Resource card notes.
4. ✅ The summary is persisted in the database keyed by user + node id.
5. ✅ Scanned PDFs work (OCR path) for at least the first N pages (configurable limit).
6. ✅ Unauthenticated users cannot upload or summarise; they see a clear sign-in requirement.

## Edge Cases
- **Large PDFs**: enforce a size limit and page limit; show a friendly message.
- **OCR slow**: show progress and allow retry.
- **Host blocks iframe**: preview still offers “Open” in a new tab.
- **LLM failure/timeouts**: show error and allow retry without losing the uploaded PDF.

## Non-Functional Requirements (Optional)
- **Performance**: default to a small OCR page limit to keep the UI responsive.
- **Security**: never expose secret keys to the client; summarisation must run server-side; endpoints must require auth.
- **Beginner-friendly**: keep code localized; avoid complex abstractions.



