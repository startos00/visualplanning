import { tool } from "ai";
import { z } from "zod";
import { callDumboLogic } from "@/app/lib/ai/agents/dumbo";
import { callDumbyLogic } from "@/app/lib/ai/agents/dumby";
import { scanCanvasNodes, generatePlan } from "@/app/lib/ai/agents/grimpy";
import {
  webSearch,
  deepResearch,
  extractFromUrls,
  suggestSources,
} from "@/app/lib/ai/agents/researcher";
import {
  decomposeScope,
  researchStandards,
  prioritizeItems,
  decomposeToTasks,
  trackExecution,
  runQualityGate,
  discoverOpportunities,
  generatePersistentPlan,
  reviewPlan,
  runPlanningPipeline,
} from "@/app/lib/ai/agents/planner";
import {
  readProjectFile,
  listProjectFiles,
  searchInFiles,
} from "@/app/lib/ai/agents/codeReader";
import {
  saveMemory,
  recallMemories,
  forgetMemory,
} from "@/app/lib/ai/agents/memory";
import {
  createCanvasNode,
  createMultipleCanvasNodes,
  updateCanvasNode,
  deleteCanvasNode,
  connectCanvasNodes,
} from "@/app/lib/ai/agents/canvas";
import {
  createGithubIssue,
  listGithubIssues,
  syncPlanToGithub,
} from "@/app/lib/ai/agents/github";

/**
 * Build orchestrator tools that Grimpy can use to delegate to subagents.
 * Each tool calls extracted service functions (not HTTP).
 */
export function buildOrchestratorTools({
  projectId,
  userId,
  userDateTime,
  onStatus,
  onCanvasUpdated,
}: {
  projectId: string;
  userId: string;
  userDateTime?: string;
  onStatus?: (status: string) => void;
  onCanvasUpdated?: () => void;
}) {
  return {
    delegateToDumbo: tool({
      description:
        "Ask Dumbo about deadlines, task status, overdue items, or execution tracking. Use this when the user asks about tasks, deadlines, what's overdue, or what's due today/tomorrow.",
      inputSchema: z.object({
        query: z.string().describe("The question to ask Dumbo about deadlines or tasks"),
      }),
      execute: async ({ query }: { query: string }) => {
        onStatus?.("Consulting Dumbo about deadlines...");
        const result = await callDumboLogic({
          query,
          projectId,
          userId,
          userDateTime,
        });
        return {
          response: result.response,
          nodeIds: result.nodeIds,
          deadlines: result.deadlines,
        };
      },
    }),

    delegateToDumby: tool({
      description:
        "Ask Dumby to analyze a document, explain a concept, or extract information from text. Use this when the user asks about document content or needs text analysis.",
      inputSchema: z.object({
        query: z.string().describe("The question to ask Dumby"),
        documentContext: z
          .string()
          .optional()
          .describe("Optional document text or context to analyze"),
        intent: z
          .enum(["EXPLAIN", "CRITIQUE", "GENERAL"])
          .optional()
          .describe("Analysis intent: EXPLAIN for simplification, CRITIQUE for critical analysis, GENERAL for Q&A"),
      }),
      execute: async ({ query, documentContext, intent }: { query: string; documentContext?: string; intent?: "EXPLAIN" | "CRITIQUE" | "GENERAL" }) => {
        onStatus?.("Analyzing with Dumby...");
        const result = await callDumbyLogic({
          query,
          documentContext,
          intent: intent || "GENERAL",
          userId,
        });
        return { response: result.response };
      },
    }),

    scanCanvasState: tool({
      description:
        "Read the current project canvas to see all nodes, tasks, strategies, and resources. Use this to understand the project's current state before making recommendations.",
      inputSchema: z.object({}),
      execute: async () => {
        onStatus?.("Scanning canvas...");
        const summary = await scanCanvasNodes({ projectId, userId });
        return summary;
      },
    }),

    generatePlan: tool({
      description:
        "Create a structured 6-level plan (North Star → Vision → Strategy → Operations → Tactical → Resources) from a set of ideas. Use this when the user wants to create or generate a plan.",
      inputSchema: z.object({
        ideas: z
          .array(z.object({ id: z.string(), content: z.string() }))
          .describe("List of ideas to transform into a plan"),
        timelineType: z
          .enum(["daily", "weekly", "monthly", "quarterly", "phases"])
          .optional()
          .describe("Timeline granularity for the plan"),
        goal: z.string().optional().describe("Optional goal context"),
        constraints: z.string().optional().describe("Optional constraints"),
      }),
      execute: async ({ ideas, timelineType, goal, constraints }: { ideas: Array<{ id: string; content: string }>; timelineType?: string; goal?: string; constraints?: string }) => {
        onStatus?.("Generating plan...");
        const plan = await generatePlan({
          ideas,
          timelineType: (timelineType as any) || "weekly",
          context: goal || constraints ? { goal, constraints } : undefined,
        });
        return plan;
      },
    }),

    suggestNextActions: tool({
      description:
        "Analyze the current project state and recommend what to focus on next. Scans tasks, deadlines, and progress to suggest priorities.",
      inputSchema: z.object({
        focusArea: z
          .string()
          .optional()
          .describe("Optional area to focus suggestions on, e.g. 'this week', 'today', 'blocked tasks'"),
      }),
      execute: async ({ focusArea }: { focusArea?: string }) => {
        onStatus?.("Analyzing priorities...");

        // Gather data from both subagents
        const [canvasState, deadlineInfo] = await Promise.all([
          scanCanvasNodes({ projectId, userId }),
          callDumboLogic({
            query: focusArea
              ? `What tasks are relevant to: ${focusArea}`
              : "Scan all deadlines",
            projectId,
            userId,
            userDateTime,
          }),
        ]);

        return {
          canvasState,
          deadlineInfo: {
            response: deadlineInfo.response,
            deadlines: deadlineInfo.deadlines,
          },
          focusArea: focusArea || "general",
        };
      },
    }),

    // ─── Research Tools ────────────────────────────────────────────

    webSearch: tool({
      description:
        "Search the web for real-time information on any topic. Use this to find current data, articles, guides, tools, and references relevant to the user's planning or research needs. Returns ranked results with an AI-generated answer.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("The search query — be specific for better results"),
        topic: z
          .enum(["general", "news", "finance"])
          .optional()
          .describe("Search category: general (default), news for recent events, finance for market/business data"),
        maxResults: z
          .number()
          .optional()
          .describe("Number of results to return (default 8, max 20)"),
        timeRange: z
          .enum(["day", "week", "month", "year"])
          .optional()
          .describe("Limit results to a recent time period"),
      }),
      execute: async ({
        query,
        topic,
        maxResults,
        timeRange,
      }: {
        query: string;
        topic?: "general" | "news" | "finance";
        maxResults?: number;
        timeRange?: "day" | "week" | "month" | "year";
      }) => {
        onStatus?.("Searching the web...");
        return await webSearch({ query, topic, maxResults, timeRange });
      },
    }),

    deepResearch: tool({
      description:
        "Conduct comprehensive multi-query deep research on a topic. Runs multiple targeted searches, cross-references findings, and synthesizes a structured research brief with key findings, curated sources, suggested strategic directions, and actionable next steps. Use this when the user needs thorough research to inform planning, strategy, or decision-making.",
      inputSchema: z.object({
        topic: z.string().describe("The research topic or question to investigate deeply"),
        projectContext: z
          .string()
          .optional()
          .describe("Context about the user's project to make research more relevant"),
        researchGoal: z
          .string()
          .optional()
          .describe("What the user hopes to learn or achieve from this research"),
      }),
      execute: async ({
        topic,
        projectContext,
        researchGoal,
      }: {
        topic: string;
        projectContext?: string;
        researchGoal?: string;
      }) => {
        onStatus?.("Conducting deep research...");
        return await deepResearch({ topic, projectContext, researchGoal });
      },
    }),

    extractFromUrl: tool({
      description:
        "Extract and summarize content from specific URLs. Use this when the user wants to dig deeper into a particular source, article, or webpage found during research.",
      inputSchema: z.object({
        urls: z
          .array(z.string())
          .describe("URLs to extract content from (1-5 URLs)"),
        query: z
          .string()
          .optional()
          .describe("Optional focus query to guide extraction — what to look for in the content"),
      }),
      execute: async ({ urls, query }: { urls: string[]; query?: string }) => {
        onStatus?.("Extracting content from sources...");
        return await extractFromUrls({ urls: urls.slice(0, 5), query });
      },
    }),

    suggestSources: tool({
      description:
        "Find and curate high-quality resources across ALL formats: articles, PDFs, videos (YouTube), images, infographics, tools, frameworks, courses, templates, and podcasts. Returns categorized resources with format details and relevance explanations. Use this when the user needs resources — it finds not just websites but also video tutorials, PDF guides, visual references, and more.",
      inputSchema: z.object({
        goal: z
          .string()
          .describe("The planning or execution goal to find resources for"),
        existingResources: z
          .array(z.string())
          .optional()
          .describe("Resources the user already has (to avoid duplicates)"),
        domain: z
          .string()
          .optional()
          .describe("Industry or domain context for more targeted suggestions"),
      }),
      execute: async ({
        goal,
        existingResources,
        domain,
      }: {
        goal: string;
        existingResources?: string[];
        domain?: string;
      }) => {
        onStatus?.("Finding relevant resources...");
        return await suggestSources({ goal, existingResources, domain });
      },
    }),

    // ─── Planning & Execution Skills (10 tools) ────────────────────

    scopeDecompose: tool({
      description:
        "Break down a project vision into Epics and Stories with acceptance criteria. Use this when the user describes a project idea or goal and needs it structured into actionable work items. Produces 3-7 Epics each with 2-5 Stories.",
      inputSchema: z.object({
        vision: z.string().describe("The project vision or goal to decompose"),
        constraints: z.string().optional().describe("Any constraints or limitations"),
      }),
      execute: async ({ vision, constraints }: { vision: string; constraints?: string }) => {
        onStatus?.("Decomposing scope into epics and stories...");
        const canvas = await scanCanvasNodes({ projectId, userId });
        return await decomposeScope({ vision, canvasContext: canvas, constraints });
      },
    }),

    researchStandards: tool({
      description:
        "Research best practices, industry standards, and recommended tools for a specific domain. Uses web search to find real, current information. Use when the user needs to understand how to approach a domain properly before planning.",
      inputSchema: z.object({
        domain: z.string().describe("The domain or technology to research standards for"),
        specificFocus: z.string().optional().describe("Specific aspect to focus on"),
      }),
      execute: async ({ domain, specificFocus }: { domain: string; specificFocus?: string }) => {
        onStatus?.("Researching standards and best practices...");
        return await researchStandards({ domain, specificFocus });
      },
    }),

    prioritizeTasks: tool({
      description:
        "Prioritize a list of tasks or stories using the RICE framework (Reach x Impact x Confidence / Effort). Produces scored, ranked items with do-first/do-next/do-later recommendations. Use when the user needs help deciding what to work on first.",
      inputSchema: z.object({
        items: z.array(z.object({
          id: z.string(),
          title: z.string(),
          description: z.string().optional(),
        })).describe("Items to prioritize"),
        projectGoal: z.string().optional().describe("The overall project goal for context"),
      }),
      execute: async ({
        items,
        projectGoal,
      }: {
        items: Array<{ id: string; title: string; description?: string }>;
        projectGoal?: string;
      }) => {
        onStatus?.("Running RICE prioritization...");
        return await prioritizeItems({ items, projectGoal });
      },
    }),

    decomposeToTasks: tool({
      description:
        "Break a story or feature into 1-6 small, atomic tasks that can each be completed independently in under 2 hours. Each task has a clear definition of done, type, and dependencies. Use when moving from planning to execution.",
      inputSchema: z.object({
        title: z.string().describe("The story or feature title"),
        description: z.string().describe("What needs to be done"),
        acceptanceCriteria: z.array(z.string()).optional().describe("How we know it's done"),
      }),
      execute: async ({
        title,
        description,
        acceptanceCriteria,
      }: {
        title: string;
        description: string;
        acceptanceCriteria?: string[];
      }) => {
        onStatus?.("Decomposing into atomic tasks...");
        const canvas = await scanCanvasNodes({ projectId, userId });
        const existingTasks = canvas.tacticalNodes.map((t) => t.title);
        return await decomposeToTasks({
          story: { title, description, acceptanceCriteria },
          existingTasks,
        });
      },
    }),

    trackExecution: tool({
      description:
        "Generate an execution status report showing progress, blockers, risks, and next recommendations. Analyzes the canvas for completed/in-progress/todo tasks and deadline health. Use when the user wants to know where they stand.",
      inputSchema: z.object({}),
      execute: async () => {
        onStatus?.("Tracking execution progress...");
        return await trackExecution({ projectId, userId, userDateTime });
      },
    }),

    qualityGate: tool({
      description:
        "Run a quality gate assessment on the project. Checks strategy clarity, task coverage, completion rate, resource availability, deadline health, and scope balance. Produces a pass/fail score with detailed gaps. Use before sign-off or major milestones.",
      inputSchema: z.object({}),
      execute: async () => {
        onStatus?.("Running quality gate checks...");
        return await runQualityGate({ projectId, userId });
      },
    }),

    discoverOpportunities: tool({
      description:
        "Identify strategic opportunities for the project by analyzing current state and researching market/domain trends. Returns quick wins, strategic bets, and areas needing research. Use when the user wants to explore growth directions.",
      inputSchema: z.object({
        projectDescription: z.string().describe("What the project is about"),
        domain: z.string().optional().describe("Industry or domain for context"),
      }),
      execute: async ({ projectDescription, domain }: { projectDescription: string; domain?: string }) => {
        onStatus?.("Discovering opportunities...");
        const canvas = await scanCanvasNodes({ projectId, userId });
        return await discoverOpportunities({ projectDescription, canvasContext: canvas, domain });
      },
    }),

    generatePersistentPlan: tool({
      description:
        "Generate persistent planning documents: a task plan with phases and checkboxes, a findings document with decisions and risks, and a progress log. Use when the user wants a comprehensive written plan they can track over time.",
      inputSchema: z.object({
        vision: z.string().describe("The project vision"),
      }),
      execute: async ({ vision }: { vision: string }) => {
        onStatus?.("Generating planning documents...");
        const canvas = await scanCanvasNodes({ projectId, userId });
        return await generatePersistentPlan({ vision, canvasContext: canvas });
      },
    }),

    reviewPlan: tool({
      description:
        "Get a second-opinion review of a plan. Checks for gaps, risks, missing considerations, and completeness. Returns strengths, weaknesses, and a verdict. Use after generating a plan to validate it before execution.",
      inputSchema: z.object({
        plan: z.string().describe("The plan text to review"),
        projectGoal: z.string().optional().describe("The goal this plan serves"),
      }),
      execute: async ({ plan, projectGoal }: { plan: string; projectGoal?: string }) => {
        onStatus?.("Reviewing plan for gaps and risks...");
        return await reviewPlan({ plan, projectGoal });
      },
    }),

    runFullPipeline: tool({
      description:
        "Run the COMPLETE planning pipeline end-to-end: Scope Decomposition → RICE Prioritization → Execution Tracking → Quality Gate → Plan Review. This is the most comprehensive planning tool — it chains all skills together for a full project analysis in one go. Use when the user says 'plan everything', 'full analysis', or wants a complete project assessment.",
      inputSchema: z.object({
        vision: z.string().describe("The project vision or goal"),
        constraints: z.string().optional().describe("Any constraints or limitations"),
      }),
      execute: async ({ vision, constraints }: { vision: string; constraints?: string }) => {
        onStatus?.("Running full planning pipeline...");
        return await runPlanningPipeline({
          vision,
          projectId,
          userId,
          constraints,
          userDateTime,
        });
      },
    }),

    // ─── Code & File Reading Tools ─────────────────────────────────

    readFile: tool({
      description:
        "Read a file from the project codebase. Supports .md, .ts, .tsx, .js, .jsx, .json, .css, .sql, .yaml, .txt, and more. Use this to read documentation, source code, configuration files, or any text file in the project. Great for understanding how features work, reading docs, or analyzing code.",
      inputSchema: z.object({
        filePath: z
          .string()
          .describe(
            "Relative path to the file from the project root. Examples: 'docs/project-description.md', 'app/components/AgentChat.tsx', 'package.json'"
          ),
      }),
      execute: async ({ filePath }: { filePath: string }) => {
        onStatus?.(`Reading file: ${filePath}...`);
        return await readProjectFile({ filePath });
      },
    }),

    listFiles: tool({
      description:
        "List files and directories in the project. Use this to explore the project structure, find files, or understand how the codebase is organized. Supports recursive listing and filtering by name pattern.",
      inputSchema: z.object({
        directory: z
          .string()
          .optional()
          .describe(
            "Directory to list, relative to project root. Examples: 'app/components', 'docs', 'app/api'. Leave empty for root."
          ),
        pattern: z
          .string()
          .optional()
          .describe(
            "Filter files by name pattern. Examples: '.md', '.tsx', 'route.ts'"
          ),
        recursive: z
          .boolean()
          .optional()
          .describe("Whether to list subdirectories recursively (default: false, max depth: 3)"),
      }),
      execute: async ({
        directory,
        pattern,
        recursive,
      }: {
        directory?: string;
        pattern?: string;
        recursive?: boolean;
      }) => {
        onStatus?.(`Listing files in ${directory || "project root"}...`);
        return await listProjectFiles({ directory, pattern, recursive });
      },
    }),

    searchCode: tool({
      description:
        "Search for text/code across project files. Find where functions are defined, where components are used, how features are implemented, or locate specific patterns in the codebase. Returns matching lines with file paths and line numbers.",
      inputSchema: z.object({
        query: z
          .string()
          .describe("Text or code to search for (case-insensitive)"),
        directory: z
          .string()
          .optional()
          .describe("Limit search to a specific directory, e.g. 'app/components'"),
        filePattern: z
          .string()
          .optional()
          .describe("Filter to specific file types, e.g. '.tsx', '.md', 'route.ts'"),
        maxResults: z
          .number()
          .optional()
          .describe("Maximum results to return (default: 20)"),
      }),
      execute: async ({
        query,
        directory,
        filePattern,
        maxResults,
      }: {
        query: string;
        directory?: string;
        filePattern?: string;
        maxResults?: number;
      }) => {
        onStatus?.(`Searching codebase for "${query}"...`);
        return await searchInFiles({ query, directory, filePattern, maxResults });
      },
    }),

    // ─── Memory Tools (persistent across conversations) ───────────

    saveMemory: tool({
      description:
        "Save an important insight, decision, preference, learning, or context about the project to persistent memory. These memories survive across conversations, letting you build understanding over time. Save memories when you learn something important about the project, user's preferences, or make a key decision.",
      inputSchema: z.object({
        category: z
          .enum(["insight", "decision", "preference", "learning", "context"])
          .describe("Type: insight (patterns/observations), decision (choices made), preference (user working style), learning (lessons/mistakes), context (background info)"),
        content: z
          .string()
          .describe("The memory content — be specific and actionable"),
        importance: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .describe("Importance 1-10 (default 5). Use 8-10 for critical decisions, 1-3 for minor observations"),
      }),
      execute: async ({
        category,
        content,
        importance,
      }: {
        category: "insight" | "decision" | "preference" | "learning" | "context";
        content: string;
        importance?: number;
      }) => {
        onStatus?.("Saving to memory...");
        return await saveMemory({
          userId,
          projectId,
          category,
          content,
          importance,
        });
      },
    }),

    recallMemories: tool({
      description:
        "Search and retrieve persistent memories about this project. Use this to recall past decisions, user preferences, project context, or lessons learned from previous conversations. Memories are auto-loaded at conversation start, but use this tool for targeted searches.",
      inputSchema: z.object({
        category: z
          .enum(["insight", "decision", "preference", "learning", "context"])
          .optional()
          .describe("Filter by memory category"),
        query: z
          .string()
          .optional()
          .describe("Search term to filter memories by content"),
        limit: z
          .number()
          .optional()
          .describe("Max memories to return (default 20)"),
      }),
      execute: async ({
        category,
        query,
        limit,
      }: {
        category?: "insight" | "decision" | "preference" | "learning" | "context";
        query?: string;
        limit?: number;
      }) => {
        onStatus?.("Recalling memories...");
        return await recallMemories({
          userId,
          projectId,
          category,
          query,
          limit,
        });
      },
    }),

    forgetMemory: tool({
      description:
        "Delete a specific memory by its ID. Use this when a memory is outdated, incorrect, or no longer relevant.",
      inputSchema: z.object({
        memoryId: z.string().describe("The UUID of the memory to delete"),
      }),
      execute: async ({ memoryId }: { memoryId: string }) => {
        onStatus?.("Forgetting memory...");
        return await forgetMemory({ userId, memoryId });
      },
    }),

    // ─── Canvas Write-back Tools ────────────────────────────────────

    createCanvasNode: tool({
      description:
        "Create a new node on the project canvas. Use this to add tasks, strategies, resources, or any node type directly to the user's board. After creating, the canvas auto-refreshes. Supported types: northstar, vision, strategy, operations, tactical, resource.",
      inputSchema: z.object({
        type: z
          .enum(["northstar", "vision", "strategy", "operations", "tactical", "resource"])
          .describe("Node type to create"),
        title: z.string().describe("Node title"),
        notes: z.string().optional().describe("Node description/notes"),
        status: z
          .enum(["todo", "in_progress", "done"])
          .optional()
          .describe("Status (tactical nodes only)"),
        deadline: z
          .string()
          .optional()
          .describe("Deadline in ISO format YYYY-MM-DD (tactical nodes)"),
        link: z
          .string()
          .optional()
          .describe("URL link (resource nodes only)"),
        color: z
          .string()
          .optional()
          .describe("Hex color like #22d3ee"),
      }),
      execute: async ({
        type,
        title,
        notes,
        status,
        deadline,
        link,
        color,
      }: {
        type: "northstar" | "vision" | "strategy" | "operations" | "tactical" | "resource";
        title: string;
        notes?: string;
        status?: "todo" | "in_progress" | "done";
        deadline?: string;
        link?: string;
        color?: string;
      }) => {
        onStatus?.(`Creating ${type} node: "${title}"...`);
        const result = await createCanvasNode({
          projectId,
          userId,
          type,
          title,
          notes,
          status,
          deadline,
          link,
          color,
        });
        if (result.success) onCanvasUpdated?.();
        return result;
      },
    }),

    createMultipleNodes: tool({
      description:
        "Create multiple nodes on the canvas at once — perfect for populating the board from a plan, decomposition, or batch of tasks. Optionally auto-connect them in sequence. Use this after scopeDecompose, decomposeToTasks, or when building out a full plan on the canvas.",
      inputSchema: z.object({
        nodes: z.array(z.object({
          type: z.enum(["northstar", "vision", "strategy", "operations", "tactical", "resource"]),
          title: z.string(),
          notes: z.string().optional(),
          status: z.enum(["todo", "in_progress", "done"]).optional(),
          deadline: z.string().optional(),
          link: z.string().optional(),
          color: z.string().optional(),
        })).describe("Array of nodes to create"),
        autoConnect: z
          .boolean()
          .optional()
          .describe("Connect nodes in sequence with edges (default false)"),
      }),
      execute: async ({
        nodes,
        autoConnect,
      }: {
        nodes: Array<{
          type: "northstar" | "vision" | "strategy" | "operations" | "tactical" | "resource";
          title: string;
          notes?: string;
          status?: "todo" | "in_progress" | "done";
          deadline?: string;
          link?: string;
          color?: string;
        }>;
        autoConnect?: boolean;
      }) => {
        onStatus?.(`Creating ${nodes.length} nodes on canvas...`);
        const result = await createMultipleCanvasNodes({
          projectId,
          userId,
          nodes,
          autoConnect,
        });
        if (result.success) onCanvasUpdated?.();
        return result;
      },
    }),

    updateCanvasNode: tool({
      description:
        "Update an existing node on the canvas. Change its title, notes, status, deadline, or color. Use scanCanvasState first to find the node ID you want to update.",
      inputSchema: z.object({
        nodeId: z.string().describe("The ID of the node to update (from scanCanvasState)"),
        title: z.string().optional().describe("New title"),
        notes: z.string().optional().describe("New notes/description"),
        status: z.enum(["todo", "in_progress", "done"]).optional().describe("New status (tactical only)"),
        deadline: z.string().optional().describe("New deadline YYYY-MM-DD"),
        color: z.string().optional().describe("New hex color"),
      }),
      execute: async ({
        nodeId,
        title,
        notes,
        status,
        deadline,
        color,
      }: {
        nodeId: string;
        title?: string;
        notes?: string;
        status?: "todo" | "in_progress" | "done";
        deadline?: string;
        color?: string;
      }) => {
        onStatus?.("Updating canvas node...");
        const result = await updateCanvasNode({
          projectId,
          userId,
          nodeId,
          title,
          notes,
          status,
          deadline,
          color,
        });
        if (result.success) onCanvasUpdated?.();
        return result;
      },
    }),

    deleteCanvasNode: tool({
      description:
        "Delete a node from the canvas. Also removes all edges connected to it. Use scanCanvasState first to find the node ID.",
      inputSchema: z.object({
        nodeId: z.string().describe("The ID of the node to delete"),
      }),
      execute: async ({ nodeId }: { nodeId: string }) => {
        onStatus?.("Deleting canvas node...");
        const result = await deleteCanvasNode({ projectId, userId, nodeId });
        if (result.success) onCanvasUpdated?.();
        return result;
      },
    }),

    connectNodes: tool({
      description:
        "Create an edge between two nodes on the canvas. Use to show relationships, dependencies, or flow. Vertical (top→bottom) for hierarchy; horizontal (left→right) for siblings/sequence. Add labels to describe the relationship.",
      inputSchema: z.object({
        sourceId: z.string().describe("ID of the source node"),
        targetId: z.string().describe("ID of the target node"),
        label: z.string().optional().describe("Edge label describing the relationship (e.g. 'drives', 'supports', 'blocks')"),
        direction: z.enum(["vertical", "horizontal"]).optional().describe("Edge direction: vertical (default, top-down) or horizontal (left-right)"),
      }),
      execute: async ({
        sourceId,
        targetId,
        label,
        direction,
      }: {
        sourceId: string;
        targetId: string;
        label?: string;
        direction?: "vertical" | "horizontal";
      }) => {
        onStatus?.("Connecting nodes...");
        const result = await connectCanvasNodes({
          projectId,
          userId,
          sourceId,
          targetId,
          label,
          direction,
        });
        if (result.success) onCanvasUpdated?.();
        return result;
      },
    }),

    // ─── GitHub Integration Tools ───────────────────────────────────

    createGithubIssue: tool({
      description:
        "Create a GitHub issue in a repository. Use when the user wants to track a task, bug, or feature in GitHub. Requires GITHUB_TOKEN env var.",
      inputSchema: z.object({
        repo: z.string().describe("Repository in 'owner/repo' format, e.g. 'myuser/myproject'"),
        title: z.string().describe("Issue title"),
        body: z.string().optional().describe("Issue body (Markdown)"),
        labels: z.array(z.string()).optional().describe("Labels to add"),
        assignees: z.array(z.string()).optional().describe("GitHub usernames to assign"),
      }),
      execute: async ({
        repo,
        title,
        body,
        labels,
        assignees,
      }: {
        repo: string;
        title: string;
        body?: string;
        labels?: string[];
        assignees?: string[];
      }) => {
        onStatus?.("Creating GitHub issue...");
        return await createGithubIssue({ repo, title, body, labels, assignees });
      },
    }),

    listGithubIssues: tool({
      description:
        "List GitHub issues from a repository. Use to check existing issues, find duplicates before creating, or review project status on GitHub.",
      inputSchema: z.object({
        repo: z.string().describe("Repository in 'owner/repo' format"),
        state: z.enum(["open", "closed", "all"]).optional().describe("Issue state filter (default: open)"),
        labels: z.string().optional().describe("Comma-separated labels to filter by"),
        limit: z.number().optional().describe("Max issues to return (default 30)"),
      }),
      execute: async ({
        repo,
        state,
        labels,
        limit,
      }: {
        repo: string;
        state?: "open" | "closed" | "all";
        labels?: string;
        limit?: number;
      }) => {
        onStatus?.("Fetching GitHub issues...");
        return await listGithubIssues({ repo, state, labels, limit });
      },
    }),

    syncPlanToGithub: tool({
      description:
        "Sync an entire plan's tasks to GitHub issues in bulk. Creates one issue per task with consistent labeling. Perfect for pushing a decomposed plan to GitHub for team tracking. Use after scopeDecompose, decomposeToTasks, or runFullPipeline.",
      inputSchema: z.object({
        repo: z.string().describe("Repository in 'owner/repo' format"),
        planTitle: z.string().describe("Name of the plan being synced"),
        tasks: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          type: z.string().optional().describe("Task type like 'epic', 'story', 'task', 'bug'"),
          priority: z.string().optional().describe("Priority like 'high', 'medium', 'low'"),
        })).describe("Tasks to create as GitHub issues"),
        labels: z.array(z.string()).optional().describe("Common labels for all issues"),
      }),
      execute: async ({
        repo,
        planTitle,
        tasks,
        labels,
      }: {
        repo: string;
        planTitle: string;
        tasks: Array<{
          title: string;
          description?: string;
          type?: string;
          priority?: string;
        }>;
        labels?: string[];
      }) => {
        onStatus?.(`Syncing ${tasks.length} tasks to GitHub...`);
        return await syncPlanToGithub({ repo, planTitle, tasks, labels });
      },
    }),
  };
}
