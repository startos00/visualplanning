/**
 * Planner Service — 10 planning & execution skills for the Grimpy orchestrator.
 *
 * Inspired by:
 *   - ln-200 Scope Decomposer (levnikolaevich)
 *   - ln-001 Standards Researcher
 *   - ln-230 Story Prioritizer (RICE)
 *   - ln-300 Task Coordinator
 *   - ln-400 Story Executor
 *   - ln-500 Quality Gate
 *   - ln-201 Opportunity Discoverer
 *   - OthmanAdi/planning-with-files
 *   - robbyt/plan-review
 *   - ln-1000 Pipeline Orchestrator
 *
 * All functions use generateText with Haiku for fast/cheap subagent calls.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { webSearch } from "./researcher";
import { scanCanvasNodes, type CanvasNodeSummary } from "./grimpy";
import { checkDeadlines } from "@/app/lib/ai/tools/checkDeadlines";
import { db } from "@/app/lib/db";
import { projects } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";

const MODEL = "claude-haiku-4-5-20251001";

function ai(system: string, prompt: string, maxTokens = 2000) {
  return generateText({
    model: anthropic(MODEL),
    system,
    messages: [{ role: "user", content: prompt }],
    maxOutputTokens: maxTokens,
  });
}

function tryParseJson<T>(raw: string, fallback: T): T {
  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    return JSON.parse(match[1]!.trim());
  } catch {
    return fallback;
  }
}

// ─── 1. Scope Decomposer ────────────────────────────────────────────

export interface Epic {
  id: string;
  title: string;
  description: string;
  stories: Story[];
}

export interface Story {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  estimatedEffort: "small" | "medium" | "large";
}

export interface ScopeDecomposition {
  projectVision: string;
  epics: Epic[];
  outOfScope: string[];
  assumptions: string[];
}

/**
 * Skill 1: Scope Decomposer
 * Breaks down a project vision into Epics → Stories with acceptance criteria.
 */
export async function decomposeScope({
  vision,
  canvasContext,
  constraints,
}: {
  vision: string;
  canvasContext?: CanvasNodeSummary;
  constraints?: string;
}): Promise<ScopeDecomposition> {
  const contextBlock = canvasContext
    ? `\nExisting canvas state: ${canvasContext.totalNodes} nodes (${JSON.stringify(canvasContext.byType)}). Strategy nodes: ${canvasContext.strategyNodes.map((n) => n.title).join(", ")}. Tactical nodes: ${canvasContext.tacticalNodes.map((n) => `${n.title} [${n.status || "todo"}]`).join(", ")}.`
    : "";

  const { text } = await ai(
    `You are a senior project decomposer. Break down visions into 3-7 Epics, each with 2-5 Stories. Each story must have clear acceptance criteria. Output valid JSON matching: { "projectVision": "...", "epics": [{ "id": "E1", "title": "...", "description": "...", "stories": [{ "id": "E1-S1", "title": "...", "description": "...", "acceptanceCriteria": ["..."], "estimatedEffort": "small|medium|large" }] }], "outOfScope": ["..."], "assumptions": ["..."] }`,
    `Decompose this project:\n\nVision: ${vision}${contextBlock}${constraints ? `\nConstraints: ${constraints}` : ""}`,
    3000
  );

  return tryParseJson<ScopeDecomposition>(text, {
    projectVision: vision,
    epics: [],
    outOfScope: [],
    assumptions: [text.slice(0, 500)],
  });
}

// ─── 2. Standards Researcher ─────────────────────────────────────────

export interface StandardsResearch {
  domain: string;
  bestPractices: Array<{ practice: string; source: string; why: string }>;
  antiPatterns: string[];
  recommendedTools: Array<{ name: string; url: string; purpose: string }>;
  references: Array<{ title: string; url: string }>;
}

/**
 * Skill 2: Standards Researcher
 * Researches best practices, standards, and tools for a domain using web search.
 */
export async function researchStandards({
  domain,
  specificFocus,
}: {
  domain: string;
  specificFocus?: string;
}): Promise<StandardsResearch> {
  // Use web search to gather real data
  let searchContext = "";
  try {
    const results = await webSearch({
      query: `${domain} best practices standards ${specificFocus || ""} 2025 2026`,
      maxResults: 8,
    });
    searchContext = `\nSearch results:\nAnswer: ${results.answer}\n\nSources:\n${results.results.map((r) => `- "${r.title}" (${r.url}): ${r.snippet.slice(0, 200)}`).join("\n")}`;
  } catch {
    searchContext = "\n(Web search unavailable — using knowledge base only)";
  }

  const { text } = await ai(
    `You are a standards researcher. Analyze the domain and produce a structured research output. Output valid JSON: { "domain": "...", "bestPractices": [{ "practice": "...", "source": "...", "why": "..." }], "antiPatterns": ["..."], "recommendedTools": [{ "name": "...", "url": "...", "purpose": "..." }], "references": [{ "title": "...", "url": "..." }] }. Include 4-6 best practices, 3-4 anti-patterns, and 3-5 tools. Always include real URLs from the search results.`,
    `Research standards and best practices for: ${domain}${specificFocus ? `\nFocus: ${specificFocus}` : ""}${searchContext}`,
    2500
  );

  return tryParseJson<StandardsResearch>(text, {
    domain,
    bestPractices: [],
    antiPatterns: [],
    recommendedTools: [],
    references: [],
  });
}

// ─── 3. Story Prioritizer (RICE) ────────────────────────────────────

export interface PrioritizedItem {
  id: string;
  title: string;
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  riceScore: number;
  rationale: string;
  recommendation: "do-first" | "do-next" | "do-later" | "reconsider";
}

/**
 * Skill 3: Story Prioritizer
 * RICE prioritization (Reach × Impact × Confidence / Effort) with rationale.
 */
export async function prioritizeItems({
  items,
  projectGoal,
}: {
  items: Array<{ id: string; title: string; description?: string }>;
  projectGoal?: string;
}): Promise<PrioritizedItem[]> {
  const { text } = await ai(
    `You are a prioritization expert using the RICE framework. Score each item:
- Reach (1-10): How many users/goals does this affect?
- Impact (1-3): 1=low, 2=medium, 3=high
- Confidence (0.5-1.0): How sure are we about the estimates?
- Effort (1-10): Person-weeks of effort (higher = more effort)
- RICE Score = (Reach × Impact × Confidence) / Effort

Output valid JSON array: [{ "id": "...", "title": "...", "reach": N, "impact": N, "confidence": N, "effort": N, "riceScore": N, "rationale": "...", "recommendation": "do-first|do-next|do-later|reconsider" }]
Sort by riceScore descending. Top 25% = do-first, next 25% = do-next, next 25% = do-later, bottom = reconsider.`,
    `Prioritize these items${projectGoal ? ` for the goal: "${projectGoal}"` : ""}:\n\n${items.map((i) => `- [${i.id}] ${i.title}${i.description ? `: ${i.description}` : ""}`).join("\n")}`,
    2500
  );

  return tryParseJson<PrioritizedItem[]>(text, []);
}

// ─── 4. Task Coordinator ─────────────────────────────────────────────

export interface AtomicTask {
  id: string;
  title: string;
  description: string;
  type: "implementation" | "research" | "design" | "test" | "documentation";
  dependencies: string[];
  estimatedMinutes: number;
  definition_of_done: string[];
}

/**
 * Skill 4: Task Coordinator
 * Decomposes a story/epic into 1-6 atomic, independently executable tasks.
 */
export async function decomposeToTasks({
  story,
  existingTasks,
}: {
  story: { title: string; description: string; acceptanceCriteria?: string[] };
  existingTasks?: string[];
}): Promise<AtomicTask[]> {
  const { text } = await ai(
    `You are a task decomposition specialist. Break stories into 1-6 atomic tasks. Each task must be:
- Independently executable (no implicit dependencies)
- Completable in under 2 hours
- Have a clear definition of done

Output valid JSON array: [{ "id": "T1", "title": "...", "description": "...", "type": "implementation|research|design|test|documentation", "dependencies": ["T0"], "estimatedMinutes": N, "definition_of_done": ["..."] }]`,
    `Decompose this story into atomic tasks:

Title: ${story.title}
Description: ${story.description}
${story.acceptanceCriteria ? `Acceptance Criteria:\n${story.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}` : ""}
${existingTasks?.length ? `\nExisting tasks (avoid duplication): ${existingTasks.join(", ")}` : ""}`,
    2000
  );

  return tryParseJson<AtomicTask[]>(text, []);
}

// ─── 5. Execution Tracker ────────────────────────────────────────────

export interface ExecutionStatus {
  completedTasks: Array<{ id: string; title: string; status: string }>;
  inProgressTasks: Array<{ id: string; title: string; blockers?: string }>;
  upcomingTasks: Array<{ id: string; title: string; readyToStart: boolean }>;
  overallProgress: number;
  estimatedCompletion: string;
  risks: string[];
  nextRecommendation: string;
}

/**
 * Skill 5: Execution Tracker
 * Analyzes canvas state to produce an execution status report.
 */
export async function trackExecution({
  projectId,
  userId,
  userDateTime,
}: {
  projectId: string;
  userId: string;
  userDateTime?: string;
}): Promise<ExecutionStatus> {
  const canvas = await scanCanvasNodes({ projectId, userId });

  // Get deadline info
  const project = await db
    .select({ nodes: projects.nodes })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);
  const nodes = ((project[0]?.nodes as any[]) || []);
  const deadlines = await checkDeadlines(nodes, userDateTime);

  const completed = canvas.tacticalNodes.filter((t) => t.status === "done");
  const inProgress = canvas.tacticalNodes.filter((t) => t.status === "in_progress");
  const todo = canvas.tacticalNodes.filter((t) => !t.status || t.status === "todo");
  const total = canvas.tacticalNodes.length;

  const { text } = await ai(
    `You are an execution tracking analyst. Analyze task progress and produce insights. Output valid JSON: { "completedTasks": [...], "inProgressTasks": [...], "upcomingTasks": [...], "overallProgress": 0-100, "estimatedCompletion": "...", "risks": ["..."], "nextRecommendation": "..." }`,
    `Project execution status:
- Total tactical tasks: ${total}
- Done: ${completed.map((t) => t.title).join(", ") || "none"}
- In Progress: ${inProgress.map((t) => t.title).join(", ") || "none"}
- Todo: ${todo.map((t) => t.title).join(", ") || "none"}
- Overdue: ${deadlines.overdue.map((t) => `${t.label} (due ${t.deadline})`).join(", ") || "none"}
- Due today: ${deadlines.today.map((t) => t.label).join(", ") || "none"}
- Strategy nodes: ${canvas.strategyNodes.map((n) => n.title).join(", ") || "none"}
- Resources: ${canvas.resourceNodes.map((n) => n.title).join(", ") || "none"}

Provide progress %, completion estimate, risks, and next action recommendation.`
  );

  return tryParseJson<ExecutionStatus>(text, {
    completedTasks: completed.map((t) => ({ id: t.id, title: t.title, status: "done" })),
    inProgressTasks: inProgress.map((t) => ({ id: t.id, title: t.title })),
    upcomingTasks: todo.map((t) => ({ id: t.id, title: t.title, readyToStart: true })),
    overallProgress: total > 0 ? Math.round((completed.length / total) * 100) : 0,
    estimatedCompletion: "Unable to estimate",
    risks: deadlines.overdue.length > 0 ? [`${deadlines.overdue.length} overdue task(s)`] : [],
    nextRecommendation: inProgress.length > 0
      ? `Continue working on: ${inProgress[0].title}`
      : todo.length > 0
        ? `Start next task: ${todo[0].title}`
        : "All tasks complete!",
  });
}

// ─── 6. Quality Gate ─────────────────────────────────────────────────

export interface QualityGateResult {
  passed: boolean;
  score: number;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
  gaps: string[];
  recommendation: string;
}

/**
 * Skill 6: Quality Gate
 * Validates completeness of a plan or execution before sign-off.
 */
export async function runQualityGate({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<QualityGateResult> {
  const canvas = await scanCanvasNodes({ projectId, userId });

  const { text } = await ai(
    `You are a quality gate reviewer. Evaluate project completeness across these checks:
1. Strategy Clarity — Does the project have clear strategy/vision nodes?
2. Task Coverage — Are there tactical tasks for each strategy?
3. Task Completion — What % of tasks are done?
4. Resource Availability — Are needed resources linked?
5. Deadline Health — Are there overdue or undated tasks?
6. Scope Balance — Is the scope realistic (not too many open tasks)?

Output valid JSON: { "passed": true/false, "score": 0-100, "checks": [{ "name": "...", "passed": true/false, "details": "..." }], "gaps": ["..."], "recommendation": "..." }
Pass threshold: score >= 70.`,
    `Evaluate this project:
- Total nodes: ${canvas.totalNodes} (${JSON.stringify(canvas.byType)})
- Strategy: ${canvas.strategyNodes.map((n) => n.title).join(", ") || "NONE — missing strategy!"}
- Tasks: ${canvas.tacticalNodes.length} total — ${canvas.tacticalNodes.filter((t) => t.status === "done").length} done, ${canvas.tacticalNodes.filter((t) => t.status === "in_progress").length} in progress, ${canvas.tacticalNodes.filter((t) => !t.status || t.status === "todo").length} todo
- Tasks with deadlines: ${canvas.tacticalNodes.filter((t) => t.deadline).length}/${canvas.tacticalNodes.length}
- Resources: ${canvas.resourceNodes.length} (${canvas.resourceNodes.map((n) => n.title).join(", ") || "none"})`,
    1500
  );

  return tryParseJson<QualityGateResult>(text, {
    passed: false,
    score: 0,
    checks: [],
    gaps: ["Quality gate analysis failed"],
    recommendation: "Re-run the quality gate",
  });
}

// ─── 7. Opportunity Discoverer ───────────────────────────────────────

export interface OpportunityAnalysis {
  currentState: string;
  opportunities: Array<{
    title: string;
    description: string;
    impact: "high" | "medium" | "low";
    effort: "high" | "medium" | "low";
    evidence: string;
  }>;
  quickWins: string[];
  strategicBets: string[];
  researchNeeded: string[];
}

/**
 * Skill 7: Opportunity Discoverer
 * Analyzes project state + web research to identify growth opportunities.
 */
export async function discoverOpportunities({
  projectDescription,
  canvasContext,
  domain,
}: {
  projectDescription: string;
  canvasContext?: CanvasNodeSummary;
  domain?: string;
}): Promise<OpportunityAnalysis> {
  // Research the domain for opportunities
  let searchContext = "";
  try {
    const results = await webSearch({
      query: `${projectDescription} ${domain || ""} opportunities trends growth strategies`,
      maxResults: 6,
      topic: "general",
    });
    searchContext = `\nMarket research:\n${results.answer}\n\nSources: ${results.results.map((r) => `${r.title} (${r.url})`).join("; ")}`;
  } catch {
    searchContext = "";
  }

  const canvasBlock = canvasContext
    ? `\nCurrent project state: ${canvasContext.totalNodes} nodes. Strategies: ${canvasContext.strategyNodes.map((n) => n.title).join(", ")}. Tasks: ${canvasContext.tacticalNodes.length} (${canvasContext.tacticalNodes.filter((t) => t.status === "done").length} done).`
    : "";

  const { text } = await ai(
    `You are a strategic opportunity analyst. Identify high-impact opportunities the project should consider. Output valid JSON: { "currentState": "...", "opportunities": [{ "title": "...", "description": "...", "impact": "high|medium|low", "effort": "high|medium|low", "evidence": "..." }], "quickWins": ["..."], "strategicBets": ["..."], "researchNeeded": ["..."] }. Include 3-6 opportunities, 2-3 quick wins, 1-2 strategic bets, and areas needing deeper research.`,
    `Analyze opportunities for: ${projectDescription}${canvasBlock}${searchContext}`,
    2500
  );

  return tryParseJson<OpportunityAnalysis>(text, {
    currentState: projectDescription,
    opportunities: [],
    quickWins: [],
    strategicBets: [],
    researchNeeded: ["Unable to analyze — retry with more context"],
  });
}

// ─── 8. Plan Persistence ─────────────────────────────────────────────

export interface PersistentPlan {
  taskPlan: string;
  findings: string;
  progress: string;
}

/**
 * Skill 8: Plan Persistence (Planning with Files)
 * Generates persistent markdown planning documents:
 *   - task_plan.md — phases and progress checkboxes
 *   - findings.md — research discoveries
 *   - progress.md — session logs
 */
export async function generatePersistentPlan({
  vision,
  epics,
  canvasContext,
}: {
  vision: string;
  epics?: Epic[];
  canvasContext?: CanvasNodeSummary;
}): Promise<PersistentPlan> {
  const epicBlock = epics?.length
    ? epics
        .map(
          (e) =>
            `### ${e.title}\n${e.description}\n${e.stories.map((s) => `- [ ] ${s.title} (${s.estimatedEffort})`).join("\n")}`
        )
        .join("\n\n")
    : "";

  const canvasBlock = canvasContext
    ? `Tasks from canvas:\n${canvasContext.tacticalNodes.map((t) => `- [${t.status === "done" ? "x" : " "}] ${t.title}${t.deadline ? ` (due: ${t.deadline})` : ""}`).join("\n")}`
    : "";

  const { text: taskPlan } = await ai(
    `Generate a markdown task plan document. Use checkboxes (- [ ]) for tracking. Organize by phases. Be specific and actionable.`,
    `Project: ${vision}\n\n${epicBlock}\n\n${canvasBlock}\n\nCreate a structured task_plan.md with phases, milestones, and checkboxes.`,
    2000
  );

  const { text: findings } = await ai(
    `Generate a findings document that captures key discoveries, decisions, and open questions for this project. Use markdown headers and bullet points.`,
    `Project: ${vision}\n\nCreate a findings.md capturing:\n1. Key decisions made\n2. Open questions\n3. Risks identified\n4. Dependencies discovered`,
    1000
  );

  const { text: progress } = await ai(
    `Generate a progress log entry for a planning session. Include date, what was accomplished, and next steps.`,
    `Project: ${vision}\nSession: Initial planning\nEpics defined: ${epics?.length || 0}\nTasks on canvas: ${canvasContext?.tacticalNodes.length || 0}\n\nCreate a progress.md entry.`,
    500
  );

  return { taskPlan, findings, progress };
}

// ─── 9. Plan Review ──────────────────────────────────────────────────

export interface PlanReview {
  overallAssessment: "strong" | "adequate" | "needs-work" | "incomplete";
  strengths: string[];
  gaps: Array<{ area: string; severity: "critical" | "major" | "minor"; suggestion: string }>;
  risks: Array<{ risk: string; likelihood: "high" | "medium" | "low"; mitigation: string }>;
  missingConsiderations: string[];
  verdict: string;
}

/**
 * Skill 9: Plan Review (Second Opinion)
 * Reviews a plan for gaps, risks, and completeness.
 */
export async function reviewPlan({
  plan,
  projectGoal,
}: {
  plan: string;
  projectGoal?: string;
}): Promise<PlanReview> {
  const { text } = await ai(
    `You are a senior project reviewer providing a second opinion on plans. Be constructive but thorough. Check for:
1. Missing steps or incomplete coverage
2. Risk assessment gaps
3. Breaking changes or rollback complexity
4. Edge case handling
5. Resource and timeline realism
6. Dependencies and blockers not addressed

Output valid JSON: { "overallAssessment": "strong|adequate|needs-work|incomplete", "strengths": ["..."], "gaps": [{ "area": "...", "severity": "critical|major|minor", "suggestion": "..." }], "risks": [{ "risk": "...", "likelihood": "high|medium|low", "mitigation": "..." }], "missingConsiderations": ["..."], "verdict": "..." }`,
    `Review this plan${projectGoal ? ` for the goal: "${projectGoal}"` : ""}:\n\n${plan}`,
    2000
  );

  return tryParseJson<PlanReview>(text, {
    overallAssessment: "incomplete",
    strengths: [],
    gaps: [{ area: "Review failed", severity: "critical", suggestion: "Retry" }],
    risks: [],
    missingConsiderations: [],
    verdict: "Unable to complete review",
  });
}

// ─── 10. Pipeline Orchestrator ───────────────────────────────────────

export interface PipelineResult {
  phase: string;
  phasesCompleted: string[];
  currentOutput: any;
  nextPhase: string | null;
  summary: string;
}

/**
 * Skill 10: Pipeline Orchestrator
 * Runs the full planning pipeline: Scope → Prioritize → Decompose → Review.
 * Chains skills together for end-to-end planning in one call.
 */
export async function runPlanningPipeline({
  vision,
  projectId,
  userId,
  constraints,
  userDateTime,
}: {
  vision: string;
  projectId: string;
  userId: string;
  constraints?: string;
  userDateTime?: string;
}): Promise<{
  scope: ScopeDecomposition;
  priorities: PrioritizedItem[];
  executionStatus: ExecutionStatus;
  qualityGate: QualityGateResult;
  review: PlanReview;
  summary: string;
}> {
  // Phase 1: Scan existing canvas
  const canvas = await scanCanvasNodes({ projectId, userId });

  // Phase 2: Decompose scope
  const scope = await decomposeScope({ vision, canvasContext: canvas, constraints });

  // Phase 3: Prioritize all stories
  const allStories = scope.epics.flatMap((e) =>
    e.stories.map((s) => ({ id: s.id, title: s.title, description: s.description }))
  );
  const priorities = allStories.length > 0 ? await prioritizeItems({ items: allStories, projectGoal: vision }) : [];

  // Phase 4: Check current execution status
  const executionStatus = await trackExecution({ projectId, userId, userDateTime });

  // Phase 5: Run quality gate
  const qualityGate = await runQualityGate({ projectId, userId });

  // Phase 6: Review the overall plan
  const planText = `Vision: ${vision}\n\nEpics:\n${scope.epics.map((e) => `- ${e.title}: ${e.stories.length} stories`).join("\n")}\n\nTop priorities:\n${priorities.slice(0, 5).map((p) => `- ${p.title} (RICE: ${p.riceScore.toFixed(1)}) → ${p.recommendation}`).join("\n")}\n\nExecution: ${executionStatus.overallProgress}% complete\nQuality: ${qualityGate.score}/100`;
  const review = await reviewPlan({ plan: planText, projectGoal: vision });

  // Phase 7: Generate summary
  const { text: summary } = await ai(
    `Summarize a planning pipeline result in 3-4 sentences. Be strategic and actionable.`,
    `Pipeline completed:
- Scope: ${scope.epics.length} epics, ${allStories.length} stories
- Top priority: ${priorities[0]?.title || "none"} (${priorities[0]?.recommendation || "n/a"})
- Execution: ${executionStatus.overallProgress}% complete
- Quality gate: ${qualityGate.passed ? "PASSED" : "FAILED"} (${qualityGate.score}/100)
- Review: ${review.overallAssessment}
- Key risk: ${review.risks[0]?.risk || "none identified"}`,
    300
  );

  return { scope, priorities, executionStatus, qualityGate, review, summary };
}
