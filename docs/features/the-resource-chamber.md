# Feature Requirement Document (FRED): The Resource Chamber

## Feature Name
The Resource Chamber

## Goal
Create a centralized, slide-out library (The Resource Chamber) managed by Dumby (the Manager Octopus) that lists all media-related nodes on the canvas. This provides a "Heptabase-style" library for quick access, search, and navigation to PDFs, Videos, and Links.

## User Story
As a user managing complex projects with many references, I want a dedicated sidebar that organizes all my resource nodes in one place, so that I can quickly find a specific document and jump to its location on the canvas.

## Functional Requirements

### 1. ResourceChamber Sidebar Component
- **Position**: Fixed on the left side of the screen.
- **Animation**: Slide-out transition when opened/closed.
- **Visual Style**: 
  - Dark glassmorphism (`bg-slate-900/95` with backdrop-blur).
  - Orange accents (representing Dumby's domain).
  - Scrollable list of resource items.

### 2. Trigger Button
- **Icon**: Book icon (using `lucide-react`).
- **Location**: Top-left of the main UI, near other global controls.
- **Action**: Toggles the `isOpen` state of the Resource Chamber.

### 3. Resource Detection & Filtering
- **Logic**: Derive the list from the current React Flow node state using `useReactFlow().getNodes()`.
- **Inclusion Criteria**:
  - Node type is `'media'` (planned future type).
  - Node type is `'resource'` (current project type).
  - Node label/title contains specific emojis: 📺 (Video), 📄 (Document/PDF), 🔗 (Link).
- **Real-time**: The list must update automatically as nodes are added, removed, or their titles are edited.

### 4. Search & Filtering (Tabs)
- **Search Bar**: Text input to filter the list by node title.
- **Tabs**: Quick filter buttons to narrow down by media type:
  - **All**: Every identified resource.
  - **Video**: Nodes with `videoUrl` or 📺 emoji.
  - **PDF**: Nodes with `pdfUrl` or 📄 emoji.
  - **Link**: Nodes with `link` or 🔗 emoji.
  - **Highlights**: Extracted text snippets from PDFs (persisted in the database).

### 5. PDF Highlights Integration
- **Detection**: Fetch highlights from the `highlights` table associated with any resource node on the canvas.
- **Display**: Highlights should appear under their parent resource in the list, or as a separate "Highlights" tab.
- **Action**: Clicking a highlight pans the camera to the parent resource node and potentially opens the PDF reader to that specific highlight (future phase).

### 6. Navigation (Locate Feature)
- **Action**: When a user clicks an item in the Resource Chamber list:
  - Calculate the center coordinates $(x, y)$ of the target node.
  - Use React Flow's `setCenter(x, y, { zoom: 1.2, duration: 800 })` to pan the camera to that node.
  - Optionally highlight the node briefly to help the user identify it.


## User Flow
1. User clicks the **Book Icon** in the top-left UI.
2. The **Resource Chamber** slides out from the left.
3. User sees a list of all resources currently on the canvas.
4. User types in the **Search Bar** or clicks a **Tab** (e.g., "Video") to find a specific resource.
5. User clicks on a resource item in the list.
6. The canvas camera smoothly pans and zooms to the selected node.
7. User closes the sidebar by clicking the toggle button again or a close button inside the sidebar.

## Acceptance Criteria
- [ ] Sidebar component `ResourceChamber.tsx` is created and integrated into the main page.
- [ ] Trigger button with Book icon is visible in the top-left UI.
- [ ] List correctly displays all `'resource'` and `'media'` nodes.
- [ ] Emoji detection (📺, 📄, 🔗) correctly identifies resources.
- [ ] Search functionality filters the list in real-time.
- [ ] Tabs (Video, PDF, Link) correctly filter the list.
- [ ] Clicking a list item pans the React Flow camera to the correct node.
- [ ] Visuals match the "Dark glassmorphism + Orange accents" aesthetic.

## Edge Cases
- **No Resources**: Display a "No resources found in this chamber..." message with an orange glow.
- **Large Number of Nodes**: Ensure the list remains performant (using `useMemo` for filtering).
- **Node Moved/Deleted**: The list should stay in sync with the canvas state.
- **Empty Titles**: Handle nodes with no title gracefully (show "Untitled Resource").

## Non-Functional Requirements
- **Performance**: Scanning nodes should not cause UI jank during canvas interactions.
- **UX**: The slide-out should feel "physical" and smooth, matching the deep-sea airlock theme.

