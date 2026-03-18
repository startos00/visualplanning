import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { generatePlan } from "@/app/lib/ai/agents/grimpy";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Parse markdown content into structured ideas for plan generation.
 * Extracts headings, list items, and substantial paragraphs.
 */
function markdownToIdeas(
  content: string
): Array<{ id: string; content: string }> {
  const lines = content.split("\n").filter((l) => l.trim());
  const ideas: Array<{ id: string; content: string }> = [];
  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) {
      // Heading → becomes an idea and sets current section context
      currentSection = trimmed.replace(/^#+\s*/, "").trim();
      if (currentSection) {
        ideas.push({ id: `md-${ideas.length}`, content: currentSection });
      }
    } else if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      /^\d+\.\s/.test(trimmed)
    ) {
      // List item → becomes an idea with section context
      const item = trimmed.replace(/^[-*]\s+|^\d+\.\s+/, "").trim();
      if (item) {
        const prefix = currentSection ? `[${currentSection}] ` : "";
        ideas.push({ id: `md-${ideas.length}`, content: prefix + item });
      }
    } else if (trimmed.length > 15) {
      // Substantial paragraph text
      ideas.push({ id: `md-${ideas.length}`, content: trimmed });
    }
  }

  // Cap at 50 ideas to avoid token limits
  return ideas.slice(0, 50);
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content, timelineType = "weekly", goal, constraints } = body ?? {};

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid markdown content" },
        { status: 400 }
      );
    }

    if (content.length > 100_000) {
      return NextResponse.json(
        { error: "File too large. Max 100KB of text." },
        { status: 400 }
      );
    }

    // Parse markdown into ideas
    const ideas = markdownToIdeas(content);

    if (ideas.length === 0) {
      return NextResponse.json(
        { error: "Could not extract any ideas from the markdown file. Make sure it has headings, lists, or paragraphs." },
        { status: 400 }
      );
    }

    // Generate plan using existing pipeline
    const plan = await generatePlan({
      ideas,
      timelineType: timelineType as any,
      context: goal || constraints ? { goal, constraints } : undefined,
    });

    return NextResponse.json({
      plan,
      ideasExtracted: ideas.length,
    });
  } catch (error) {
    console.error("md-to-plan error:", error);
    const err = error as any;
    return NextResponse.json(
      { error: err?.message || "Failed to generate plan from markdown" },
      { status: 500 }
    );
  }
}
