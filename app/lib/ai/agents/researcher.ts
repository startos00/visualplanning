import { tavily } from "@tavily/core";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const RESEARCHER_MODEL = "claude-haiku-4-5-20251001";

function getTavilyClient() {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing TAVILY_API_KEY. Add it to your .env.local to enable research capabilities."
    );
  }
  return tavily({ apiKey });
}

// ─── Types ───────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
  publishedDate?: string;
}

export interface ResearchBrief {
  topic: string;
  summary: string;
  keyFindings: string[];
  sources: Array<{ title: string; url: string; relevance: string }>;
  suggestedDirections: string[];
  actionableSteps: string[];
}

export interface ExtractedContent {
  url: string;
  title: string | null;
  content: string;
  keyPoints: string[];
}

// ─── Web Search ──────────────────────────────────────────────────────

export interface WebSearchInput {
  query: string;
  topic?: "general" | "news" | "finance";
  maxResults?: number;
  timeRange?: "day" | "week" | "month" | "year";
  includeDomains?: string[];
}

/**
 * Search the web for information relevant to planning and execution.
 * Returns ranked results with AI-generated answer.
 */
export async function webSearch({
  query,
  topic = "general",
  maxResults = 8,
  timeRange,
  includeDomains,
}: WebSearchInput): Promise<{
  answer: string;
  results: SearchResult[];
  responseTime: number;
}> {
  const client = getTavilyClient();

  const response = await client.search(query, {
    searchDepth: "advanced",
    topic,
    maxResults,
    includeAnswer: "advanced",
    timeRange,
    includeDomains,
  });

  return {
    answer: response.answer || "",
    results: response.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      score: r.score,
      publishedDate: r.publishedDate,
    })),
    responseTime: response.responseTime,
  };
}

// ─── Deep Research ───────────────────────────────────────────────────

export interface DeepResearchInput {
  topic: string;
  projectContext?: string;
  researchGoal?: string;
}

/**
 * Conduct multi-query deep research on a topic.
 * Runs multiple targeted searches, cross-references findings,
 * and synthesizes a structured research brief with sources and directions.
 */
export async function deepResearch({
  topic,
  projectContext,
  researchGoal,
}: DeepResearchInput): Promise<ResearchBrief> {
  const client = getTavilyClient();

  // Phase 1: Generate targeted sub-queries from the topic
  const { text: subQueriesRaw } = await generateText({
    model: anthropic(RESEARCHER_MODEL),
    system: `You are a research strategist. Given a research topic and optional context, generate 4 focused search queries that together will provide comprehensive coverage. Output ONLY a JSON array of strings, nothing else.`,
    messages: [
      {
        role: "user",
        content: `Topic: ${topic}${projectContext ? `\nProject context: ${projectContext}` : ""}${researchGoal ? `\nResearch goal: ${researchGoal}` : ""}`,
      },
    ],
    maxOutputTokens: 300,
  });

  let subQueries: string[];
  try {
    subQueries = JSON.parse(subQueriesRaw.trim());
    if (!Array.isArray(subQueries)) throw new Error();
  } catch {
    // Fallback: use the original topic + variations
    subQueries = [
      topic,
      `${topic} best practices`,
      `${topic} common challenges and solutions`,
      `${topic} latest trends 2024 2025`,
    ];
  }

  // Phase 2: Run all searches in parallel
  const searchPromises = subQueries.map((q) =>
    client
      .search(q, {
        searchDepth: "advanced",
        maxResults: 5,
        includeAnswer: "basic",
      })
      .catch(() => null)
  );
  const searchResults = await Promise.all(searchPromises);

  // Phase 3: Collect and deduplicate all sources
  const seenUrls = new Set<string>();
  const allResults: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
    query: string;
    answer?: string;
  }> = [];

  for (let i = 0; i < searchResults.length; i++) {
    const result = searchResults[i];
    if (!result) continue;
    for (const r of result.results) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        allResults.push({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
          query: subQueries[i],
          answer: result.answer,
        });
      }
    }
  }

  // Sort by relevance score
  allResults.sort((a, b) => b.score - a.score);
  const topResults = allResults.slice(0, 15);

  // Phase 4: Synthesize into a research brief using AI
  const sourceSummary = topResults
    .map(
      (r, i) =>
        `[${i + 1}] "${r.title}" (${r.url})\nRelevance: ${(r.score * 100).toFixed(0)}%\nSnippet: ${r.content.slice(0, 400)}`
    )
    .join("\n\n");

  const answers = searchResults
    .filter((r) => r?.answer)
    .map((r, i) => `Sub-query "${subQueries[i]}": ${r!.answer}`)
    .join("\n\n");

  const { text: briefRaw } = await generateText({
    model: anthropic(RESEARCHER_MODEL),
    system: `You are a senior research analyst for a strategic planning tool. Synthesize research findings into a structured brief. Output valid JSON matching this schema:
{
  "summary": "2-3 paragraph executive summary of findings",
  "keyFindings": ["finding 1", "finding 2", ...],
  "sources": [{"title": "...", "url": "...", "relevance": "why this source matters"}],
  "suggestedDirections": ["direction 1", "direction 2", ...],
  "actionableSteps": ["step 1", "step 2", ...]
}

Guidelines:
- keyFindings: 4-6 key insights, ordered by importance
- sources: top 6-8 most relevant sources with explanation of why each matters
- suggestedDirections: 3-5 strategic directions the user could explore further
- actionableSteps: 3-5 concrete next steps the user can take immediately based on research
- Be specific and actionable, not generic`,
    messages: [
      {
        role: "user",
        content: `Research topic: ${topic}${projectContext ? `\nProject context: ${projectContext}` : ""}${researchGoal ? `\nGoal: ${researchGoal}` : ""}

## AI-generated answers from sub-queries:
${answers}

## Source materials:
${sourceSummary}

Synthesize these into a comprehensive research brief.`,
      },
    ],
    maxOutputTokens: 2000,
  });

  let brief: Omit<ResearchBrief, "topic">;
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = briefRaw.match(/```(?:json)?\s*([\s\S]*?)```/) || [
      null,
      briefRaw,
    ];
    brief = JSON.parse(jsonMatch[1]!.trim());
  } catch {
    // Fallback if AI doesn't return valid JSON
    brief = {
      summary: briefRaw.slice(0, 1000),
      keyFindings: ["Research completed but structured parsing failed. See summary."],
      sources: topResults.slice(0, 6).map((r) => ({
        title: r.title,
        url: r.url,
        relevance: `Relevance score: ${(r.score * 100).toFixed(0)}%`,
      })),
      suggestedDirections: ["Review the sources manually for deeper insights"],
      actionableSteps: ["Start with the highest-relevance sources listed above"],
    };
  }

  return { topic, ...brief };
}

// ─── URL Content Extraction ──────────────────────────────────────────

export interface ExtractUrlInput {
  urls: string[];
  query?: string;
}

/**
 * Extract and summarize content from specific URLs.
 * Useful when the user wants to dig deeper into a specific source.
 */
export async function extractFromUrls({
  urls,
  query,
}: ExtractUrlInput): Promise<ExtractedContent[]> {
  const client = getTavilyClient();

  const response = await client.extract(urls, {
    extractDepth: "advanced",
    format: "markdown",
    query,
  });

  // For each extracted result, generate key points
  const results: ExtractedContent[] = [];

  for (const r of response.results) {
    const contentPreview = r.rawContent.slice(0, 3000);

    const { text: keyPointsRaw } = await generateText({
      model: anthropic(RESEARCHER_MODEL),
      system:
        "Extract 3-5 key points from this content. Output ONLY a JSON array of strings.",
      messages: [
        {
          role: "user",
          content: `${query ? `Focus on: ${query}\n\n` : ""}Content from "${r.title || r.url}":\n${contentPreview}`,
        },
      ],
      maxOutputTokens: 500,
    });

    let keyPoints: string[];
    try {
      keyPoints = JSON.parse(keyPointsRaw.trim());
      if (!Array.isArray(keyPoints)) throw new Error();
    } catch {
      keyPoints = [contentPreview.slice(0, 200)];
    }

    results.push({
      url: r.url,
      title: r.title,
      content: contentPreview,
      keyPoints,
    });
  }

  return results;
}

// ─── Quick Source Suggestions ────────────────────────────────────────

export interface SuggestSourcesInput {
  goal: string;
  existingResources?: string[];
  domain?: string;
}

export type ResourceType =
  | "article"
  | "tool"
  | "framework"
  | "guide"
  | "video"
  | "course"
  | "template"
  | "pdf"
  | "image"
  | "infographic"
  | "podcast";

/**
 * Suggest high-quality sources and resources for a specific planning goal.
 * Searches across all media types: articles, PDFs, videos, images, tools,
 * frameworks, courses, templates, infographics, and podcasts.
 */
export async function suggestSources({
  goal,
  existingResources,
  domain,
}: SuggestSourcesInput): Promise<{
  sources: Array<{
    title: string;
    url: string;
    type: ResourceType;
    format: string;
    description: string;
    relevance: string;
  }>;
  researchGaps: string[];
}> {
  const client = getTavilyClient();

  // Run targeted searches for DIVERSE resource types — not just web articles
  const queries = [
    `${goal} best tools and frameworks`,
    `${goal} step-by-step guide how to`,
    `${goal} templates and resources`,
    // Video content (YouTube, Vimeo, etc.)
    `${goal} video tutorial youtube`,
    // PDF resources (whitepapers, research papers, cheat sheets)
    `${goal} PDF guide whitepaper cheat sheet filetype:pdf`,
    // Visual resources (infographics, diagrams, cheat sheets)
    `${goal} infographic diagram visual guide`,
  ];

  if (domain) {
    queries.push(`${goal} ${domain} industry best practices`);
    queries.push(`${goal} ${domain} case study PDF video`);
  }

  const results = await Promise.all(
    queries.map((q) =>
      client
        .search(q, {
          searchDepth: "advanced",
          maxResults: 5,
          includeAnswer: true,
        })
        .catch(() => null)
    )
  );

  // Deduplicate and collect
  const seenUrls = new Set<string>();
  const allSources: Array<{ title: string; url: string; content: string; score: number }> = [];

  for (const result of results) {
    if (!result) continue;
    for (const r of result.results) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        allSources.push({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        });
      }
    }
  }

  allSources.sort((a, b) => b.score - a.score);

  // Have AI categorize and curate across ALL resource types
  const { text: curatedRaw } = await generateText({
    model: anthropic(RESEARCHER_MODEL),
    system: `You are a multi-media resource curator for a strategic planning tool. Your job is to find and categorize the BEST resources across ALL formats — not just web articles.

Output valid JSON:
{
  "sources": [{
    "title": "...",
    "url": "...",
    "type": "article|tool|framework|guide|video|course|template|pdf|image|infographic|podcast",
    "format": "A brief format label, e.g. 'YouTube Video (12min)', 'PDF Whitepaper (24 pages)', 'Interactive Tool', 'PNG Infographic', 'Online Course (5hrs)', 'Markdown Template'",
    "description": "1-2 sentence description of what the user will get from this resource",
    "relevance": "why this specific resource helps with the goal"
  }],
  "researchGaps": ["area that needs more research", ...]
}

Resource type detection rules:
- URLs containing youtube.com, vimeo.com, youtu.be, or video content → "video"
- URLs ending in .pdf or containing PDF downloads/whitepapers → "pdf"
- URLs with images, infographics, diagrams, visual guides → "image" or "infographic"
- URLs from udemy.com, coursera.org, educative.io, etc. → "course"
- URLs from podcast platforms or audio content → "podcast"
- GitHub repos with templates → "template"
- SaaS tools, apps, calculators → "tool"

IMPORTANT: Aim for a diverse mix of resource types. Include at LEAST:
- 2-3 videos (tutorials, talks, walkthroughs)
- 1-2 PDFs (guides, whitepapers, cheat sheets)
- 1-2 visual resources (infographics, diagrams)
- Plus articles, tools, and other relevant resources

Include the 8-12 most valuable sources. Be specific about format details (video length, PDF page count, etc. when detectable).`,
    messages: [
      {
        role: "user",
        content: `Goal: ${goal}${existingResources?.length ? `\nAlready have: ${existingResources.join(", ")}` : ""}${domain ? `\nDomain: ${domain}` : ""}

Found sources:
${allSources
  .slice(0, 20)
  .map((s, i) => `${i + 1}. "${s.title}" (${s.url})\n   ${s.content.slice(0, 250)}`)
  .join("\n")}`,
      },
    ],
    maxOutputTokens: 2000,
  });

  try {
    const jsonMatch = curatedRaw.match(/```(?:json)?\s*([\s\S]*?)```/) || [
      null,
      curatedRaw,
    ];
    return JSON.parse(jsonMatch[1]!.trim());
  } catch {
    return {
      sources: allSources.slice(0, 10).map((s) => ({
        title: s.title,
        url: s.url,
        type: detectResourceType(s.url, s.title) as ResourceType,
        format: detectFormat(s.url),
        description: s.content.slice(0, 150),
        relevance: `Relevance: ${(s.score * 100).toFixed(0)}%`,
      })),
      researchGaps: ["Could not parse AI curation — showing raw results"],
    };
  }
}

/** Detect resource type from URL and title heuristics (fallback when AI fails). */
function detectResourceType(url: string, title: string): string {
  const lower = url.toLowerCase() + " " + title.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be") || lower.includes("vimeo.com")) return "video";
  if (lower.includes(".pdf") || lower.includes("whitepaper") || lower.includes("cheat sheet")) return "pdf";
  if (lower.includes("infographic") || lower.includes("diagram")) return "infographic";
  if (lower.includes("udemy") || lower.includes("coursera") || lower.includes("educative")) return "course";
  if (lower.includes("podcast") || lower.includes("spotify.com/show")) return "podcast";
  if (lower.includes("github.com") && lower.includes("template")) return "template";
  return "article";
}

/** Generate a human-readable format label from URL (fallback). */
function detectFormat(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return "YouTube Video";
  if (lower.includes("vimeo.com")) return "Vimeo Video";
  if (lower.includes(".pdf")) return "PDF Document";
  if (lower.includes("udemy")) return "Udemy Course";
  if (lower.includes("coursera")) return "Coursera Course";
  if (lower.includes("github.com")) return "GitHub Repository";
  return "Web Article";
}
