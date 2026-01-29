import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { generateObject } from "ai";
import { openai, createOpenAI } from "@ai-sdk/openai";
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
  provider?: "openai" | "google" | "openrouter";
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

    const provider: "openai" | "google" | "openrouter" = body?.provider === "google" ? "google" : body?.provider === "openrouter" ? "openrouter" : "openai";
    const requestedModel = typeof body?.model === "string" ? body.model.trim() : "";
    
    // Supported models per provider (per FRED requirements)
    const validModels = {
      google: ["gemini-2.5", "gemini-3.0-flash", "gemini-2.5-flash", "gemini-3-flash-preview"],
      openai: ["gpt-4o", "gpt-4o-mini"],
      openrouter: ["xiaomi/mimo-v2-flash", "allenai/molmo-2-8b:free", "xiaomi/mimo-v2-flash:free"],
    };
    
    const defaultModels = {
      google: "gemini-2.5-flash",
      openai: "gpt-4o",
      openrouter: "xiaomi/mimo-v2-flash",
    };
    
    const modelId = requestedModel && validModels[provider].includes(requestedModel)
      ? requestedModel
      : defaultModels[provider];

    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY in .env.local" }, { status: 500 });
    }
    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local" },
        { status: 500 },
      );
    }
    const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
    if (provider === "openrouter" && !openrouterKey) {
      return NextResponse.json(
        { error: "Missing OpenRouter API key in .env.local" },
        { status: 500 },
      );
    }

    let model;
    if (provider === "google") {
      model = google(modelId);
    } else if (provider === "openrouter") {
      // OpenRouter uses OpenAI-compatible API
      const openrouter = createOpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openrouterKey,
      });
      model = openrouter(modelId);
    } else {
      model = openai(modelId);
    }

    const { object } = await generateObject({
      model,
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

