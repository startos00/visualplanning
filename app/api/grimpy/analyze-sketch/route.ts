import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  strategy: z.object({ title: z.string(), description: z.string() }),
  tactics: z.array(z.object({ title: z.string(), dueInDays: z.number() })),
  summary: z.string(),
});

type AnalyzeSketchBody = {
  base64Image: string;
  provider?: "openai" | "google";
  model?: string;
};

const MAX_BASE64_CHARS = 8_000_000; // ~6MB binary-ish; keep conservative for request size.

function normalizeBase64Image(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_BASE64_CHARS) return null;
  return trimmed;
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<AnalyzeSketchBody>;
    const base64Image = normalizeBase64Image(body?.base64Image);
    if (!base64Image) {
      return NextResponse.json(
        { error: "Missing or invalid base64Image" },
        { status: 400 },
      );
    }

    const provider: "openai" | "google" = body?.provider === "google" ? "google" : "openai";
    const requestedModel = typeof body?.model === "string" ? body.model.trim() : "";
    const modelId =
      provider === "google"
        ? (requestedModel === "gemini-2.5-flash" || requestedModel === "gemini-3-flash-preview"
            ? requestedModel
            : "gemini-2.5-flash")
        : requestedModel === "gpt-4o"
          ? "gpt-4o"
          : "gpt-4o";

    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY in .env.local" }, { status: 500 });
    }
    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local" },
        { status: 500 },
      );
    }

    const { object } = await generateObject({
      model: provider === "google" ? google(modelId) : openai(modelId),
      schema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Turn this whiteboard sketch into a project plan." },
            { type: "image", image: base64Image },
          ],
        },
      ],
    });

    return NextResponse.json({ ...object, provider, model: modelId });
  } catch (error) {
    console.error("Mind's Eye analyze-sketch error:", error);

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
        : "Failed to analyze sketch";

    return NextResponse.json({ error: message }, { status: statusCode ?? 500 });
  }
}

