# Grimpo Lite - Visual Planning

## Project Overview
Visual planning app with deep-sea theme. Users create projects ("sectors") with interactive canvas for strategic, tactical, and resource-level planning.

## Tech Stack
- **Framework:** Next.js 16.1.0 (App Router) + React 19.2.3 + TypeScript (strict)
- **Database:** PostgreSQL (Neon serverless) + Drizzle ORM 0.41.0
- **Auth:** Better-Auth 1.0.0 (cookie-based sessions)
- **AI:** Vercel AI SDK 6.0.5 with multi-provider support (OpenAI, Google, Anthropic, OpenRouter)
- **Canvas:** ReactFlow 11.11.4 (custom node types)
- **Styling:** Tailwind CSS 4.x + Framer Motion 11.0.0 + CSS variables for theming
- **Package Manager:** pnpm

## Commands
- `pnpm dev` — Start dev server
- `pnpm build` — Production build
- `pnpm lint` — Run ESLint
- `pnpm db:generate` — Generate Drizzle migrations
- `pnpm db:migrate` — Run migrations
- `pnpm db:push` — Push schema to DB
- `pnpm db:studio` — Open Drizzle Studio

## Project Structure
```
app/
├── api/              # API routes (auth, chat, graph, pdf, media, etc.)
├── actions/          # Server Actions (projects, canvas, highlights, ideas, etc.)
├── components/       # React components
│   ├── ExecutionMode/   # Task execution views (Focus, Kanban, Today, List)
│   ├── ThoughtPool/     # Workshop/brainstorming
│   ├── AbyssalGarden/   # Reward/gamification system
│   ├── auth/            # Sign-in forms, backgrounds
│   ├── ui/              # Shared UI primitives
│   └── providers/       # Context providers
├── nodes/            # ReactFlow custom node components (GlassNode, SketchNode, etc.)
├── project/[id]/     # Project canvas page (main workspace)
├── login/            # Auth pages
└── lib/              # Utilities & services
    ├── ai/           # AI provider constants, user preferences, tools
    ├── db/           # Drizzle schema, connection, sessions
    └── hooks/        # Custom React hooks
```

## Architecture & Patterns

### Data Flow
- **Server Actions** (`app/actions/`) for database mutations (preferred)
- **API Routes** (`app/api/`) for streaming AI responses and complex operations
- **Graph state** persisted to PostgreSQL via `/api/graph` endpoints
- Composite primary keys `(id, userId)` for multi-user isolation

### Component Conventions
- `"use client"` directive on interactive components
- PascalCase for components, camelCase for utilities
- Context providers wrap root layout (`OxygenTankProvider`)
- Custom hooks in `app/lib/hooks/`
- Toast notifications via Sonner

### Auth Pattern
```typescript
const session = await auth.api.getSession({ headers: await headers() });
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```
Use `safeGetSession()` from `app/lib/safeSession.ts` for error-resilient session retrieval.

### AI Integration
- Multi-provider with fallback chain: user preferences → request params → env vars → defaults
- Two agents: **Dumbo** (chat assistant), **Dumby** (document interrogation)
- Streaming responses via Vercel AI SDK `streamText()`
- Model selection configurable per-user in `user_ai_preferences` table

### Styling
- Tailwind utility classes as primary styling method
- CSS variables for theming (`--background`, `--foreground`, etc.)
- Two themes: "abyss" (dark/deep-sea) and "surface" (light)
- Framer Motion for animations (`motion.div`, `AnimatePresence`)

### Database
- Schema defined in `app/lib/db/schema.ts` (Drizzle) and `schema.sql` (manual SQL)
- Key tables: `projects`, `graph_states`, `users`, `sessions`, `pdf_summaries`, `highlights`, `bookshelves`, `user_ai_preferences`, `abyssal_garden_states`, `grimpo_states`
- JSON columns for storing ReactFlow nodes/edges

## Key Features
1. **Canvas** — Interactive graph with Strategy/Tactical/Resource/Sketch/Media/MindMap nodes
2. **AI Assistants** — Dumbo (chat), Dumby (document analysis), Grimpy (workshop)
3. **Execution Mode** — Focus, Kanban, Today, List views for task management
4. **Document Processing** — PDF upload, annotation, OCR (Tesseract.js), AI summarization
5. **Abyssal Garden** — Gamified reward system with collectibles
6. **Mind Mapping & Sketching** — AI-generated mind maps, freehand sketch nodes

## Notes
- `reactStrictMode: false` in next.config.ts (for PDF highlighter compatibility)
- No testing framework configured
- Path alias: `@/*` maps to project root
- Environment variables in `.env.local` (see `.env.example` or SETUP_GUIDE.md for required vars)
