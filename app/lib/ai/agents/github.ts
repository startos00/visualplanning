/**
 * GitHub Integration Service — sync plans, tasks, and progress with GitHub Issues.
 *
 * Requires GITHUB_TOKEN env var and repo specification.
 * Uses GitHub REST API directly (no octokit dependency needed).
 */

const GITHUB_API = "https://api.github.com";

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN environment variable is not set");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

function parseRepo(repo: string): { owner: string; repo: string } {
  // Accept "owner/repo" or full URL
  const cleaned = repo.replace("https://github.com/", "").replace(".git", "");
  const [owner, repoName] = cleaned.split("/");
  if (!owner || !repoName) throw new Error(`Invalid repo format: "${repo}". Use "owner/repo".`);
  return { owner, repo: repoName };
}

// ─── Types ──────────────────────────────────────────────────────

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: Array<{ name: string }>;
  assignees: Array<{ login: string }>;
  created_at: string;
  updated_at: string;
  html_url: string;
  milestone?: { title: string } | null;
}

export interface CreateIssueInput {
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
}

export interface ListIssuesInput {
  repo: string;
  state?: "open" | "closed" | "all";
  labels?: string;
  sort?: "created" | "updated" | "comments";
  direction?: "asc" | "desc";
  limit?: number;
}

export interface SyncPlanInput {
  repo: string;
  planTitle: string;
  tasks: Array<{
    title: string;
    description?: string;
    type?: string;
    priority?: string;
  }>;
  labels?: string[];
  createMilestone?: boolean;
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Create a single GitHub issue.
 */
export async function createGithubIssue(input: CreateIssueInput): Promise<{
  success: boolean;
  issue?: { number: number; url: string; title: string };
  error?: string;
}> {
  try {
    const { owner, repo } = parseRepo(input.repo);

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        title: input.title,
        body: input.body || "",
        labels: input.labels || [],
        assignees: input.assignees || [],
        milestone: input.milestone,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, error: `GitHub API error (${res.status}): ${err}` };
    }

    const issue = await res.json();
    return {
      success: true,
      issue: {
        number: issue.number,
        url: issue.html_url,
        title: issue.title,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * List GitHub issues from a repository.
 */
export async function listGithubIssues(input: ListIssuesInput): Promise<{
  success: boolean;
  issues: Array<{
    number: number;
    title: string;
    state: string;
    labels: string[];
    url: string;
    createdAt: string;
    updatedAt: string;
  }>;
  error?: string;
}> {
  try {
    const { owner, repo } = parseRepo(input.repo);
    const params = new URLSearchParams({
      state: input.state || "open",
      sort: input.sort || "updated",
      direction: input.direction || "desc",
      per_page: String(input.limit || 30),
    });
    if (input.labels) params.set("labels", input.labels);

    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/issues?${params}`,
      { headers: getHeaders() }
    );

    if (!res.ok) {
      const err = await res.text();
      return { success: false, issues: [], error: `GitHub API error (${res.status}): ${err}` };
    }

    const data: GitHubIssue[] = await res.json();
    const issues = data.map((issue) => ({
      number: issue.number,
      title: issue.title,
      state: issue.state,
      labels: issue.labels.map((l) => l.name),
      url: issue.html_url,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
    }));

    return { success: true, issues };
  } catch (error) {
    return { success: false, issues: [], error: String(error) };
  }
}

/**
 * Sync a plan's tasks to GitHub issues in bulk.
 * Creates one issue per task with consistent labeling.
 */
export async function syncPlanToGithub(input: SyncPlanInput): Promise<{
  success: boolean;
  created: Array<{ number: number; title: string; url: string }>;
  failed: Array<{ title: string; error: string }>;
  message: string;
}> {
  const created: Array<{ number: number; title: string; url: string }> = [];
  const failed: Array<{ title: string; error: string }> = [];

  for (const task of input.tasks) {
    const labels = [...(input.labels || [])];
    if (task.type) labels.push(task.type);
    if (task.priority) labels.push(`priority:${task.priority}`);

    // Build issue body
    const bodyParts = [
      `## ${task.title}`,
      "",
      task.description || "No description provided.",
      "",
      `---`,
      `*Synced from Grimpo plan: ${input.planTitle}*`,
    ];

    const result = await createGithubIssue({
      repo: input.repo,
      title: task.title,
      body: bodyParts.join("\n"),
      labels,
    });

    if (result.success && result.issue) {
      created.push({
        number: result.issue.number,
        title: result.issue.title,
        url: result.issue.url,
      });
    } else {
      failed.push({ title: task.title, error: result.error || "Unknown error" });
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  return {
    success: failed.length === 0,
    created,
    failed,
    message: `Created ${created.length}/${input.tasks.length} issues${failed.length > 0 ? ` (${failed.length} failed)` : ""}`,
  };
}
