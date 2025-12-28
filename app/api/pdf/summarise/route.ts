import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { db } from "@/app/lib/db";
import { pdfSummaries } from "@/app/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

export const runtime = "nodejs";

const MAX_INPUT_CHARS = 120_000;

type PdfSummariserProvider = "anthropic" | "google";

type SummariseBody = {
  nodeId: string;
  pdfBlobUrl: string;
  filename?: string;
  extractedText: string;
};

function buildPrompt(extractedText: string) {
  return [
    "You are an assistant that produces concise, structured summaries of PDFs.",
    "Return Markdown with EXACTLY these sections and headings:",
    "",
    "## TL;DR",
    "## Key points",
    "## Action items",
    "## Risks / questions",
    "",
    "Rules:",
    "- Keep it practical and skimmable.",
    "- Use bullet points for Key points, Action items, and Risks / questions.",
    "- If information is missing/unclear, say so in Risks / questions.",
    "",
    "PDF text (may include OCR noise):",
    extractedText,
  ].join("\n");
}

function getPdfSummariserProvider(): PdfSummariserProvider {
  const raw = (process.env.PDF_SUMMARISER_PROVIDER || "").trim().toLowerCase();
  if (raw === "google" || raw === "gemini") return "google";
  return "anthropic";
}

function getPdfSummariserModelId(provider: PdfSummariserProvider): string {
  const raw = (process.env.PDF_SUMMARISER_MODEL || "").trim();
  if (raw) return raw;
  // Default to an explicit Gemini 3 model when using Google (per request),
  // otherwise keep the existing Claude default.
  return provider === "google" ? "gemini-3-flash-preview" : "claude-3-5-sonnet-latest";
}

export async function POST(request: Request) {
  let provider: PdfSummariserProvider = "anthropic";
  let modelId = "claude-3-5-sonnet-latest";

  try {
    provider = getPdfSummariserProvider();
    modelId = getPdfSummariserModelId(provider);

    if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Missing ANTHROPIC_API_KEY in .env.local (required for PDF summarisation when PDF_SUMMARISER_PROVIDER=anthropic)",
        },
        { status: 500 },
      );
    }

    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local (required for PDF summarisation when PDF_SUMMARISER_PROVIDER=google)",
        },
        { status: 500 },
      );
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<SummariseBody>;
    const nodeId = (body.nodeId || "").trim();
    const pdfBlobUrl = (body.pdfBlobUrl || "").trim();
    const filename = (body.filename || "").trim() || null;
    const extractedText = (body.extractedText || "").trim();

    if (!nodeId) return NextResponse.json({ error: "Missing nodeId" }, { status: 400 });
    if (!pdfBlobUrl) return NextResponse.json({ error: "Missing pdfBlobUrl" }, { status: 400 });
    if (!extractedText) return NextResponse.json({ error: "Missing extractedText" }, { status: 400 });

    const clippedText = extractedText.slice(0, MAX_INPUT_CHARS);

    const { text: summaryMarkdown } = await generateText({
      model: provider === "google" ? google(modelId) : anthropic(modelId),
      system: "You summarise documents into a structured, accurate, skimmable Markdown summary.",
      prompt: buildPrompt(clippedText),
      maxTokens: 900,
    });

    const userId = session.user.id;
    const now = new Date();

    let persisted = true;
    try {
      // Upsert by (user_id, node_id)
      await db
        .insert(pdfSummaries)
        .values({
          userId,
          nodeId,
          pdfBlobUrl,
          pdfFilename: filename,
          summaryMarkdown,
          summaryJson: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [pdfSummaries.userId, pdfSummaries.nodeId],
          set: {
            pdfBlobUrl,
            pdfFilename: filename,
            summaryMarkdown,
            summaryJson: null,
            updatedAt: now,
          },
          where: and(eq(pdfSummaries.userId, userId), eq(pdfSummaries.nodeId, nodeId)),
        });
    } catch (dbError: any) {
      // If the user hasn't created the tables yet, don't block summarisation.
      // Neon "relation does not exist" is 42P01.
      // Neon "column does not exist" is 42703 (table exists but schema is wrong).
      const code = dbError?.code ?? dbError?.cause?.code;
      if (code === "42P01" || code === "42703") {
        persisted = false;
        const reason =
          code === "42P01"
            ? 'table "pdf_summaries" does not exist'
            : 'table "pdf_summaries" exists but has wrong schema (missing columns)';
        console.warn(
          `PDF summarise: skipped DB persistence because ${reason}. Run the SQL below in Neon to fix:\n\nDROP TABLE IF EXISTS pdf_summaries CASCADE;\n-- Then run the CREATE TABLE from schema.sql lines 104-115`,
        );
      } else {
        throw dbError;
      }
    }

    return NextResponse.json({ summaryMarkdown, provider, model: modelId, persisted });
  } catch (error) {
    console.error("PDF summarise error:", error);

    // Bubble up useful provider errors (e.g. quota/rate-limit) instead of a generic 500.
    // The AI SDK may throw nested errors (e.g. AI_RetryError with `lastError`).
    const err = error as any;
    const nested = err?.lastError ?? err?.cause ?? err;
    const statusCode: number | undefined =
      typeof nested?.statusCode === "number"
        ? nested.statusCode
        : typeof err?.statusCode === "number"
          ? err.statusCode
          : undefined;
    const message: string =
      typeof nested?.message === "string" && nested.message.trim().length > 0
        ? nested.message
        : "Failed to summarise PDF";

    return NextResponse.json(
      {
        error: message,
        provider,
        model: modelId,
      },
      { status: statusCode ?? 500 },
    );
  }
}


