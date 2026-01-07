# Feature Requirement Document (FRED): Snippet Bookshelf & Resource Chamber Integration

## Feature Name
Snippet Bookshelf & Resource Chamber Integration

## Goal
To evolve the existing PDF highlighting system into a structured "Bookshelf" management system within the Resource Chamber. This allows users to store, categorize, and manage snippets (quotes, highlights) like books on a shelf, making them easily retrievable for later use in task creation or resource linking.

## User Story
As a researcher or project manager, I want to be able to save highlights from my documents into specific "book categories" within a "bookshelf system" in the Resource Chamber, so that I can organize my knowledge and easily find and reuse those snippets when I'm building out my project canvas or creating tasks.

## Functional Requirements

### 1. Bookshelf Organization System
- **Categories (Books)**: Users can create named "Books" or "Categories" to group related snippets (e.g., "Market Research", "Technical Specs", "Quotes").
- **Default Category**: A "General" or "Uncategorized" shelf for new highlights.
- **Movement**: Ability to move snippets between different bookshelf categories.

### 2. Enhanced Resource Chamber Integration
- **Bookshelf Tab**: A dedicated tab in the Resource Chamber (alongside Video, PDF, Link) called "Bookshelf" or "Snippets".
- **Categorized View**: Snippets are grouped by their "Book" category in a nested or accordion-style list.
- **Search**: The search bar in the Resource Chamber should filter snippets by content and category name.

### 3. Snippet Management
- **Manual Addition**: Users can manually add snippets (text notes) directly into the Resource Chamber bookshelf without needing a source PDF.
- **Deletion**: Users can delete snippets from the Resource Chamber.
- **Editing**: Users can edit the text or category of an existing snippet.
- **Highlight Source Linking**: Snippets extracted from PDFs should maintain a link to their source node and page number for quick navigation.

### 4. Snippet Utilization
- **Drag-and-Drop (Future Phase)**: Ability to drag a snippet from the Resource Chamber onto the canvas to create a new "Snippet Node" or "Task Node".
- **Link to Task**: A button on each snippet in the Resource Chamber to "Convert to Task", which spawns a task node on the canvas.
- **Resource Linking**: Ability to "attach" a snippet to an existing node on the canvas as a reference.

### 5. PDF Reader Integration (Orange Highlighter Update)
- **Save to Category**: When highlighting text in the `DumbyReader`, the context menu should allow selecting which "Book" to save the snippet into.

## Data Requirements
- **Table Update (`highlights`)**:
    - `category_id`: UUID (Foreign Key to a new `bookshelves` table).
    - `title`: String (Optional title for the snippet).
    - `type`: Enum (`highlight`, `note`).
- **New Table (`bookshelves`)**:
    - `id`: UUID (Primary Key).
    - `user_id`: UUID (Owner).
    - `name`: String (Category name).
    - `color`: String (Visual indicator for the shelf).
    - `created_at`: Timestamp.

## User Flow
1. **Highlighting**: User double-clicks a PDF, highlights text, and selects "Save to Bookshelf". They choose (or create) a category like "Design Inspiration".
2. **Managing**: User opens the Resource Chamber, clicks the "Bookshelf" tab, and sees "Design Inspiration" as a category. They expand it to see the snippet.
3. **Adding Note**: User clicks a "+" icon in the Resource Chamber Bookshelf tab to quickly type a manual note into the "Design Inspiration" category.
4. **Using Snippet**: User finds a snippet they like, clicks "Create Task", and a new task node appears on the canvas with the snippet text.
5. **Deleting**: User realizes a snippet is no longer needed and clicks the trash icon in the Resource Chamber list.

## Acceptance Criteria
- [ ] New `bookshelves` table is implemented in the database.
- [ ] `highlights` table is updated with category support.
- [ ] "Bookshelf" tab exists in `ResourceChamber.tsx` with categorized snippets.
- [ ] Users can create, rename, and delete bookshelf categories.
- [ ] Users can move snippets between categories.
- [ ] Users can manually add text snippets to the bookshelf.
- [ ] Clicking a snippet from a PDF navigates the camera to the source node.
- [ ] "Convert to Task" functionality works as expected.

## Edge Cases
- **Deleting a Category**: System should ask whether to delete all snippets inside or move them to "Uncategorized".
- **Duplicate Categories**: Prevent creating two categories with the same name for the same user.
- **Source Node Deleted**: If the PDF node is deleted, the snippet should remain but the "Navigate to Source" button should be disabled or hidden.

## Non-Functional Requirements
- **UX**: The "Bookshelf" should feel organized and "studious," using the existing orange and deep-sea aesthetic.
- **Performance**: Sorting and filtering large numbers of snippets should be efficient.
- **Persistence**: All categories and snippet associations must persist in the database.




