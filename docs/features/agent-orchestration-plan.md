# Agent Orchestration System for Grimpo Lite

## Context
The app has 3 independent AI agents (Dumbo, Dumby, Grimpy) that operate as separate API routes with no coordination. The user wants Grimpy to become a **planning orchestrator** that can delegate to Dumbo (tasks/deadlines) and Dumby (documents) as subagents, creating a seamless personal planning assistant.

## Architecture: Orchestrator-as-Tool-User

Grimpy gains tools that call the other agents' logic as **server-side functions** (not HTTP calls). Uses Vercel AI SDK's `streamText` + `maxSteps` for multi-step tool use.

```
User ↔ /api/grimpy/orchestrate (new route)
         │
         Grimpy (Claude, orchestrator with tools)
         │
    ┌────┼────────────┐
    │    │             │
  delegateToDumbo  delegateToDumby  [planning tools]
    │    │             │
  dumbo.ts  grimpy.ts  dumby.ts  (extracted service fns)
```

## Implementation (Phase 1 — MVP Orchestration)

### Step 1: Extract agent logic into reusable services

**New file: `app/lib/ai/agents/dumbo.ts`**
- Extract the deadline-checking + response generation from `/api/chat/route.ts` (lines 172-278)
- Export `callDumboLogic({ query, projectId, userId, userDateTime })` → `{ response, nodeIds, deadlines }`
- Uses `generateText()` (not streaming — tool results must be complete)
- Uses `claude-haiku-4-5-20251001` for cheap/fast subagent calls
- Reuses existing `checkDeadlines()` from `app/lib/ai/tools/checkDeadlines.ts`

**New file: `app/lib/ai/agents/grimpy.ts`**
- Extract plan generation from `/api/grimpy/workshop-plan/route.ts` (the `generateObject` + `planSchema` logic)
- Export `generatePlan({ ideas, timelineType, context, provider?, model? })` → `WorkshopPlan`
- Export `scanCanvasNodes({ projectId, userId })` → summary of current nodes

**New file: `app/lib/ai/agents/dumby.ts`**
- Extract interrogation logic from `/api/chat/dumby-interrogate/route.ts`
- Export `callDumbyLogic({ query, documentContext, intent, userId })` → `{ response }`

### Step 2: Create orchestrator tools

**New file: `app/lib/ai/tools/orchestrator.ts`**
```typescript
// Agent Delegation Tools:
delegateToDumbo    — ask Dumbo about deadlines, task status, execution tracking
delegateToDumby    — ask Dumby to analyze a document or extract info

// Project Intelligence Tools:
scanCanvasState    — read current project nodes/edges for context
generatePlan       — create a 6-level structured plan from ideas
suggestNextActions — analyze project state and recommend what to focus on

// Research & Discovery Tools (Tavily-powered):
webSearch          — search the web for real-time information, articles, guides
deepResearch       — multi-query deep research with structured brief, sources, directions
extractFromUrl     — extract and summarize content from specific URLs
suggestSources     — curate tools, guides, frameworks, templates for a goal
```

Each tool calls the extracted service functions from Step 1.

**New file: `app/lib/ai/agents/researcher.ts`**
- Tavily SDK integration for web search, deep research, URL extraction, source curation
- `webSearch()` — advanced search with AI-generated answer
- `deepResearch()` — multi-query research with sub-query generation, cross-referencing, and AI synthesis into structured brief
- `extractFromUrls()` — content extraction with AI key-point summarization
- `suggestSources()` — curated resource discovery with categorization (article/tool/framework/guide/video/course/template)

### Step 3: Create orchestrator API route

**New file: `app/api/grimpy/orchestrate/route.ts`**
- Auth check, parse body `{ messages, projectId, userDateTime }`
- Build orchestrator system prompt (Grimpy as planning guru with tool awareness)
- Call `streamText()` with Claude + tools + `maxSteps: 5`
- Return `createUIMessageStreamResponse()` with custom `data-orchestration-status` events
- Existing routes (`/api/chat`, `/api/grimpy/workshop-chat`) remain unchanged

### Step 4: Wire frontend to orchestrator

**Modify: `app/project/[id]/page.tsx`** (line 335-342)
- Change `DefaultChatTransport` api to be dynamic: when `currentAgent === "grimpy"` → use `/api/grimpy/orchestrate`, else `/api/chat`
- Extend `onData` handler (line 348) to handle `orchestrationStatus` events

**New file: `app/components/OrchestratorStatusBar.tsx`**
- Small inline component showing delegation status: "Consulting Dumbo about deadlines...", "Analyzing with Dumby..."
- Rendered inside AgentChat when Grimpy is active

### Step 5: Update MascotAgentPanel tools

**Modify: `app/components/MascotAgentPanel.tsx`**
- Add orchestrator-specific quick commands for Grimpy: "Review my progress", "What should I focus on?", "Plan my next week"

## Key files to modify
- `app/project/[id]/page.tsx` — transport routing + onData handler
- `app/components/MascotAgentPanel.tsx` — Grimpy quick commands

## Key files to create
- `app/lib/ai/agents/dumbo.ts` — extracted Dumbo logic
- `app/lib/ai/agents/dumby.ts` — extracted Dumby logic
- `app/lib/ai/agents/grimpy.ts` — extracted plan generation
- `app/lib/ai/tools/orchestrator.ts` — tool definitions
- `app/api/grimpy/orchestrate/route.ts` — orchestrator endpoint
- `app/components/OrchestratorStatusBar.tsx` — status UI

## Key patterns to reuse
- `checkDeadlines()` from `app/lib/ai/tools/checkDeadlines.ts` — directly reusable
- `planSchema` from `app/api/grimpy/workshop-plan/route.ts` — extract and share
- `getProviderAndModel()` from `app/lib/ai/getUserPreferences.ts` — for provider selection
- `createUIMessageStreamResponse` pattern from `app/api/chat/route.ts` — for custom data events

## Design decisions
- **Server-side function calls** (not HTTP) for subagent delegation — faster, no auth overhead
- **`generateText`** for subagents (not streaming) — tool results must be complete
- **Haiku for subagents**, Claude Sonnet for orchestrator — cost optimization
- **New endpoint** rather than modifying `/api/chat` — backward compatible
- **`maxSteps: 5`** — allows multi-tool chains without infinite loops

## Verification
1. Start dev server: `pnpm dev`
2. Open a project with some tactical nodes with deadlines
3. Switch to Grimpy agent in MascotAgentPanel
4. Ask "Are there any overdue tasks?" → Grimpy delegates to Dumbo, returns synthesized answer
5. Ask "Plan my next week based on current tasks" → Grimpy scans canvas + generates plan
6. Ask "What should I focus on today?" → Grimpy analyzes priorities
7. Verify existing Dumbo/Dumby direct chat still works (backward compat)
