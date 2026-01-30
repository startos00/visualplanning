# Execution Mode Views — Spec Document

## Overview

A dedicated execution panel that transforms the planning canvas into actionable task views. Designed to reduce cognitive load by hiding planning complexity and surfacing only what matters: **the next thing to do**.

**Key Innovation**: Traditional view names (Focus, Today, Kanban, List) with **intelligent features** baked in. Familiar layouts enhanced with AI-powered context awareness.

---

## Problem Statement

Planning mode shows everything: strategies, milestones, connections, ideas. This is great for **thinking**, but overwhelming for **doing**.

When executing, you need:
- Clarity on what to do NOW
- Minimal distractions
- Progress visibility
- Quick task completion flow

---

## The Four Views

### 1. Focus View — Single Task + Timer

**Purpose**: Deep work on ONE task. Zero distractions. Pomodoro-style timer.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              ◀  1 of 5 pending  ▶                               │
│                                                                 │
│                    Build landing page                           │
│                                                                 │
│          [Day 1]  [Part of: Launch MVP]  [View on canvas]       │
│                                                                 │
│               ━━━━━━━━━━━━━━━━━━━━━━━━━━━                       │
│                     25:00 remaining                             │
│               ━━━━━━━━━━━━━━━━━━━━━━━━━━━                       │
│                                                                 │
│          [  ▶ Start Dive  ]    [ ↺ Reset ]                      │
│                                                                 │
│          [ 25m ]  [ 45m ]  [ 60m ]   ← Timer presets            │
│                                                                 │
│   Notes:                                                        │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Convert Figma mockup to Next.js components...           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│          [ ✓ Complete ]              [ Skip → ]                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features**:
- Single task display, large and centered
- Pomodoro timer (25/45/60 min presets)
- Visual timer bar with color transition (green → yellow → red)
- Task notes visible
- Parent strategy context (subtle badge)
- "Complete" and "Skip" actions
- Navigate between pending tasks with arrows
- Link to view task on canvas

**Intelligent Enhancement**:
- Timer integrates with "Oxygen Tank" concept from Dumbo
- Auto-advance to next task on completion
- Plan deadline (Day 1, Week 1) shown for context

---

### 2. Today View — Date-Based Grouping

**Purpose**: See what's due today. Triage overdue and upcoming.

```
┌─────────────────────────────────────────────────────────────────┐
│ Thursday, January 30                           5 tasks pending  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚠️ OVERDUE (1)                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Fix payment bug                     Day 2 • 1 day ago │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📅 TODAY (3)                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Set up CI/CD                               Day 3      │   │
│  │ ○ Write API docs                             Day 3      │   │
│  │ ○ Deploy to staging                          Day 3      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🔮 UPCOMING (2)                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Beta launch email                    Day 4 • tomorrow │   │
│  │ ○ Analytics setup                      Day 5 • in 2 days│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ✅ COMPLETED (3)                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Set up repository                                     │   │
│  │ ✓ Build auth system                                     │   │
│  │ ✓ Code review                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features**:
- Grouped by: Overdue → Today → Upcoming → No Deadline → Completed
- Shows plan deadline (Day X) + relative date (yesterday, tomorrow, etc.)
- Quick checkbox toggle
- Click task → Focus View
- Inline deadline date picker for tasks without deadlines

**Intelligent Enhancement**:
- Tasks without deadlines shown in separate section
- Shows strategy badge for context
- Relative time display ("1 day ago", "in 2 days")

---

### 3. Kanban View — Visual Status Flow

**Purpose**: Drag-and-drop status management. See work in progress.

```
┌─────────────────────────────────────────────────────────────────┐
│  TO DO (5)          IN PROGRESS (2)       DONE (8)              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│                 │                 │                             │
│ ┌─────────────┐ │ ┌─────────────┐ │ ┌─────────────┐            │
│ │ Deploy to   │ │ │ Build hero  │ │ │ Set up repo │            │
│ │ staging     │ │ │ section     │ │ │             │            │
│ │ Day 3       │ │ │ Day 1       │ │ │ ✓ Day 1     │            │
│ │ 🎯 Launch   │ │ │ 🎯 Launch   │ │ └─────────────┘            │
│ └─────────────┘ │ └─────────────┘ │                             │
│                 │                 │ ┌─────────────┐            │
│ ┌─────────────┐ │ ┌─────────────┐ │ │ Auth system │            │
│ │ Beta email  │ │ │ Payment     │ │ │             │            │
│ │ Day 4       │ │ │ integration │ │ │ ✓ Day 2     │            │
│ └─────────────┘ │ │ Day 2       │ │ └─────────────┘            │
│                 │ └─────────────┘ │                             │
│ ┌─────────────┐ │                 │                             │
│ │ Analytics   │ │                 │                             │
│ │ Day 5       │ │                 │                             │
│ └─────────────┘ │                 │                             │
│                 │                 │                             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

**Features**:
- 3 columns: To Do → In Progress → Done
- Native HTML5 drag-and-drop between columns
- Visual feedback during drag (highlight drop zone)
- Card shows: title, plan deadline, strategy badge
- Click card → Focus View
- Column task counts

**Intelligent Enhancement**:
- Supports `in_progress` status (new addition to schema)
- Strategy badges for grouping context
- Click-to-focus integration

---

### 4. List View — Simple Checklist

**Purpose**: Scannable checklist grouped by strategy. Minimal UI.

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 Filter: [All (12)] [Pending (7)] [Done (5)]                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎯 Launch MVP                                            5/8   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Set up repository                         [2026-01-28]│   │
│  │ ✓ Configure CI/CD                           [2026-01-28]│   │
│  │ ✓ Build auth system                         [2026-01-29]│   │
│  │ ○ Build landing page               Day 1    [         ] │   │
│  │ ○ Payment integration              Day 2    [         ] │   │
│  │ ○ Deploy to staging                Day 3    [         ] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🎯 Marketing                                              0/4  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Beta launch email                Day 4    [         ] │   │
│  │ ○ Analytics setup                  Day 5    [         ] │   │
│  │ ○ Product Hunt prep                Day 6    [         ] │   │
│  │ ○ Launch!                          Day 7    [         ] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📋 Standalone Tasks                                       2/2  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✓ Review code                               [2026-01-30]│   │
│  │ ✓ Update docs                               [2026-01-30]│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features**:
- Grouped by strategy (with collapsible sections)
- Filter tabs: All / Pending / Done
- Checkbox toggle
- Plan deadline badge (Day X)
- Inline deadline date picker
- Progress count per group
- Click task → Focus View

**Intelligent Enhancement**:
- Collapsible strategy groups
- Tasks without strategy grouped as "Standalone Tasks"
- Sorted by plan deadline within each group

---

## Data Model

Uses existing `GrimpoNodeData` with updated status type:

```typescript
export type TacticalStatus = "todo" | "in_progress" | "done";

type GrimpoNodeData = {
  title: string;
  notes?: string;
  status?: TacticalStatus;      // Now supports "in_progress"
  planDeadline?: string;        // "Day 1", "Week 1" (from Grimpy plan)
  deadline?: string;            // "2026-01-30" (actual date)
  color?: string;
};
```

---

## Component Structure

```
ExecutionMode/
├── index.ts                    # Re-export
├── ExecutionModePanel.tsx      # Main container with tabs
└── views/
    ├── FocusView.tsx           # Single task + timer
    ├── TodayView.tsx           # Grouped by date
    ├── KanbanView.tsx          # 3-column drag-drop
    └── ListView.tsx            # Simple checklist
```

---

## Entry Points

How to open Execution Mode:

1. **Dumbo mascot** → "Execute" button (first tool)
2. **Keyboard shortcut** → `E` key (toggle)
3. **Existing "To-Do List"** button still available separately

---

## State Management

```typescript
type ExecutionState = {
  isOpen: boolean;
  activeView: "focus" | "today" | "kanban" | "list";
  focusedTaskId: string | null;

  // Focus View timer
  timerSeconds: number;
  timerRunning: boolean;
  timerTotal: number;

  // List View
  filter: "all" | "pending" | "done";
  collapsedGroups: Set<string>;
};
```

---

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| ExecutionModePanel | ✅ Done | Shell with tabs, progress bar |
| FocusView | ✅ Done | Timer, navigation, complete/skip |
| TodayView | ✅ Done | Date grouping, checkbox, inline deadline |
| KanbanView | ✅ Done | Drag-drop, 3 columns |
| ListView | ✅ Done | Filter tabs, collapsible groups |
| `in_progress` status | ✅ Done | Added to TacticalStatus type |
| Keyboard shortcut | ✅ Done | E key toggles panel |
| Dumbo "Execute" button | ✅ Done | First tool in Dumbo's menu |

---

## Success Criteria

- [x] Can switch between 4 views smoothly
- [x] Focus View timer works with visual feedback
- [x] Tasks update on canvas when completed
- [x] Kanban drag-drop changes status
- [x] Today View correctly groups by date
- [x] List View groups by strategy
- [x] Progress bar reflects overall completion
- [x] Keyboard shortcut (E) to open/close
- [x] Dumbo mascot has "Execute" button

---

## Related Files

- `app/components/ExecutionMode/` - All execution mode components
- `app/components/TodoPanel.tsx` - Original to-do panel (kept separate)
- `app/components/MascotAgentPanel.tsx` - Dumbo's "Execute" button
- `app/lib/graph.ts` - Node data types (TacticalStatus updated)
- `app/project/[id]/page.tsx` - Integration point
