# Feature Requirement Document: Multiple Projects (Sectors)

## Goal
Transition the application from a single-board experience per user to a multi-project environment. This allows researchers to manage multiple independent workspaces (Sectors) in parallel without data overlap. In the "Deep Sea" metaphor, users don't just open files; they travel between different **Sectors** of the ocean.

## User Story
As a deep-sea researcher (user), I want to create multiple independent projects (Sectors) and switch between them seamlessly, so that I can organize different research missions without mixing their data, nodes, or edges.

## Functional Requirements
- **Mission Control (Dashboard):** A primary landing page (`/`) listing all available Sectors for the authenticated user.
- **Sector Creation:** Ability to create a new Sector with a name and optional description.
- **Dynamic Routing:** Each Sector must have a unique URL (e.g., `/project/[id]`) for direct access and bookmarking.
- **Sector Switching:** A UI element (Sector Switcher) to travel between different Sectors without returning to Mission Control.
- **Isolated Data:** Nodes and edges saved in one Sector must not appear in another.
- **Project Metadata:** Track `created_at` and `updated_at` for each Sector to sort them by recency in Mission Control.

## Data Requirements
A new table `projects` will be introduced in the database to replace or augment the existing `grimpo_states` logic.

### `projects` Table Schema
| Column | Type | Description |
| --- | --- | --- |
| `id` | `uuid` | Primary Key (auto-generated) |
| `user_id` | `text` | Links to the `users` table in Auth |
| `name` | `text` | The name of the Sector |
| `description` | `text` | Optional description |
| `nodes` | `jsonb` | React Flow nodes array (Default: `[]`) |
| `edges` | `jsonb` | React Flow edges array (Default: `[]`) |
| `created_at` | `timestamp` | Creation time (Default: `now()`) |
| `updated_at` | `timestamp` | Last modification time |

## User Flow
1. **Login:** User authenticates and is redirected to **Mission Control** (`app/page.tsx`).
2. **Mission Control:** User sees a grid/list of their "Sectors".
3. **Action - Create:** User clicks "Deploy New Sector", enters a name, and is immediately navigated to the new Sector's coordinates (`/project/[id]`).
4. **Action - Select:** User clicks an existing Sector card and is navigated to `/project/[id]`.
5. **Research (Canvas):** User interacts with the canvas. The system auto-saves changes specifically to the project ID in the URL.
6. **Travel (Switch):** User uses the "Sector Switcher" in the sidebar/control bar to jump to another Sector.

## Acceptance Criteria
- [ ] Database contains a `projects` table with the specified columns.
- [ ] Users can create a new project and see it in their dashboard.
- [ ] Navigating to `/project/[id]` loads the correct nodes and edges for that specific project.
- [ ] Saving data in `/project/A` does not affect `/project/B`.
- [ ] `app/page.tsx` serves as a dashboard listing user projects.
- [ ] Unauthorized users cannot access projects they do not own (row-level security or server-side checks).

## Edge Cases
- **Invalid Project ID:** If a user navigates to a non-existent UUID, show a "Sector Lost" (404) page.
- **Unauthorized Access:** If a user tries to access a project belonging to someone else, return a 403 or redirect to Mission Control.
- **Empty Sector:** New projects should initialize with an empty canvas or a default template.
- **Deleting Sectors:** Users should be able to "Decommission" (delete) a Sector.

## Technical Implementation Plan
### Phase 1: Database Migration
- Update `src/db/schema.ts` to include the `projects` table.
- Use `drizzle-kit push` to update Neon database.

### Phase 2: Server Actions
- Implement `createProject`, `getUserProjects`, `getProjectData`, and `saveProjectData` in `app/actions/projects.ts`.

### Phase 3: Refactoring & Routing
- Move current `app/page.tsx` logic to `app/project/[id]/page.tsx`.
- Refactor canvas state loading/saving to use the `id` from the URL params.
- Create a new `app/page.tsx` for the Mission Control dashboard.

