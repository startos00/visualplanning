# Feature Requirement Document (FRED): Image Uploads & Lightbox Tracing Mode

## Goal
The goal of this feature is to expand the app's media capabilities by allowing users to upload and view image resources (JPG, PNG, WebP, GIF) and providing a specialized "Lightbox" mode. Lightbox mode is specifically designed for tracing existing diagrams, sketches, or screenshots, facilitating the digitization and annotation of visual information.

## User Story
As a strategic planner or designer, I want to upload images of diagrams or handwritten notes (including animated GIFs if relevant) and use them as a semi-transparent background for tracing, so that I can create clean, digital versions of my ideas while maintaining the original reference.

## Functional Requirements

### 1. General Image Support (MediaNode)
- **Component Creation**: Implement `app/nodes/MediaNode.tsx` to handle image, PDF, and Video resources.
- **Image Rendering**: 
    - Support `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
    - If the resource is an image, render it using a responsive `<img>` tag.
    - Fallback to existing PDF viewer (`DumbyReader`) or Video player (YouTube iframe) if applicable.
- **Visuals**: 
    - Images should have a simple border frame consistent with the app's theme.
    - Images should be responsive within the node, with adjustable or fixed max-width.
- **Draggable**: Standard `MediaNode` instances are draggable by default.

### 2. Lightbox Node (New)
- **Component Creation**: Create `app/nodes/LightboxNode.tsx`.
- **Purpose**: A specialized node for background tracing.
- **Visuals**:
    - Renders the uploaded image full-size within the node.
    - Includes an **Opacity Slider** (Default 50%) at the top of the node.
- **Tracing Logic**:
    - **Locking**: Default to `{ draggable: false }` to prevent accidental movement while the user is drawing on top of it.
    - The node should be positioned behind other nodes if possible (z-index management).

### 3. CreationDock Integration
- **'Lightbox' Option**: Add a new button to the `CreationDock` menu.
- **Lightbox Creation Flow**:
    1. User selects 'Lightbox'.
    2. Opens a file picker restricted to images.
    3. Uploads the image to the server.
    4. Creates a `LightboxNode` at the current viewport center.
    5. **Auto-Trigger Drawing**: Immediately sets `isDrawingMode` to `true` to allow instant tracing.
- **'Media' Option Update**:
    1. Update the existing file picker to accept Images, PDFs, and Videos.
    2. If an image is selected, create a standard `MediaNode` (draggable, 100% opacity, no auto-drawing).

### 4. Media Upload API Refactoring
- Update `app/api/pdf/upload/route.ts` (potentially rename or generalize) to:
    - Support `image/jpeg`, `image/png`, `image/webp`, `image/gif` in addition to `application/pdf`.
    - Handle appropriate file naming and storage paths (e.g., `images/` vs `pdfs/`).

## User Flow
1. User clicks the **"+"** button on the `CreationDock`.
2. User selects **"Lightbox"**.
3. A native file picker appears; user selects a PNG or GIF diagram.
4. The image is uploaded, and a `LightboxNode` is spawned at the center of the screen.
5. The **Sketch Mode** (drawing overlay) is automatically activated.
6. User uses the **Opacity Slider** on the `LightboxNode` to dim the image to 30%.
7. User selects a cyan pen and traces the flow of the diagram.
8. User clicks **"DONE DRAWING"**; the sketch is saved as a `SketchNode` over the `LightboxNode`.

## Acceptance Criteria
- [ ] Users can upload JPG, PNG, WebP, and GIF images via both 'Media' and 'Lightbox' paths.
- [ ] `MediaNode` correctly renders images with a border frame.
- [ ] `LightboxNode` renders images with an opacity slider and is not draggable by default.
- [ ] Selecting 'Lightbox' in `CreationDock` triggers the file picker and then auto-activates drawing mode.
- [ ] Standard 'Media' uploads do NOT auto-activate drawing mode.
- [ ] Images are persisted in Vercel Blob and load correctly on project refresh.
- [ ] Uploading a file that is not an image or PDF (or too large) shows a clear error message.

## Edge Cases
- **Large Images**: Should be handled without crashing the browser; consider `object-fit: contain` or `cover`.
- **Z-Index**: `LightboxNode` should ideally stay behind sketches and other tactical/strategy nodes.
- **Drawing Toggle**: If the user exits drawing mode, the `LightboxNode` should remain visible and its opacity should still be adjustable.
- **Multiple Lightboxes**: The system should handle multiple lightbox nodes, though tracing usually happens on one at a time.

## Non-Functional Requirements
- **Performance**: Uploading and rendering images should be fast and not freeze the UI.
- **UX**: The transition from image selection to drawing mode should feel seamless and immediate.
- **Accessibility**: Slider and buttons should be keyboard accessible.

## Data Requirements
- **TypeScript Types**: Add `imageUrl`, `imageOpacity`, and `isLightbox` fields to `GrimpoNodeData` in `app/lib/graph.ts`.
- **Database**: **No database schema update is required.** The existing `nodes` table stores data as `jsonb`, which allows for flexible schema expansion. New fields will be automatically persisted within the node's JSON blob.
- **Vercel Blob**: Images will be stored in Vercel Blob, similar to existing PDF uploads.

