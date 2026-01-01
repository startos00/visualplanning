import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

export const runtime = "nodejs";

type InterrogateIntent = "EXPLAIN" | "CRITIQUE" | "GENERAL";

type InterrogateBody = {
  messages: Array<{ role: "user" | "assistant"; content?: string } | any>;
  context?: string; // The highlighted text snippet (optional)
  intent: InterrogateIntent;
};

function buildSystemPrompt(intent: InterrogateIntent): string {
  const basePersona = "You are Dumby, an efficient Knowledge Manager.";
  
  switch (intent) {
    case "EXPLAIN":
      return `${basePersona} Your role is to simplify jargon and complex concepts using ELI5 (Explain Like I'm 5) style. Break down technical terms, academic language, and complex ideas into simple, clear explanations that anyone can understand. Use analogies and everyday examples when helpful.`;
    
    case "CRITIQUE":
      return `${basePersona} Your role is to critically analyze claims and check for:\n- Logical fallacies (ad hominem, strawman, false cause, etc.)\n- Vague or ambiguous language\n- Unsupported assertions without evidence\n- Missing context or incomplete information\n- Potential biases or assumptions\n\nBe direct, thorough, and constructive in your analysis. Point out weaknesses but also acknowledge strengths when present.`;
    
    case "GENERAL":
      return `${basePersona} Answer the user's specific questions about the highlighted text snippet. Be concise, accurate, and helpful. Focus on what the user is asking rather than providing unnecessary context.`;
    
    default:
      return basePersona;
  }
}

function getProvider() {
  const raw = (process.env.DUMBY_INTERROGATE_PROVIDER || "openai").trim().toLowerCase();
  if (raw === "anthropic") return "anthropic";
  if (raw === "google") return "google";
  return "openai";
}

function getModelId(provider: string): string {
  const raw = process.env.DUMBY_INTERROGATE_MODEL?.trim();
  if (raw) return raw;
  
  // Defaults
  if (provider === "anthropic") return "claude-3-5-sonnet-latest";
  if (provider === "google") return "gemini-3-flash-preview";
  return "gpt-4o-mini"; // Default to OpenAI
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<InterrogateBody>;
    const { messages, context, intent } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid messages" }, { status: 400 });
    }

    const contextText = typeof context === "string" ? context.trim() : "";

    const validIntent: InterrogateIntent = intent === "EXPLAIN" || intent === "CRITIQUE" ? intent : "GENERAL";
    const provider = getProvider();
    const modelId = getModelId(provider);

    // Check API keys
    if (provider === "openai" && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in .env.local" },
        { status: 500 }
      );
    }
    if (provider === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Missing ANTHROPIC_API_KEY in .env.local" },
        { status: 500 }
      );
    }
    if (provider === "google" && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(validIntent);

    // Normalize messages coming from the client (supports both {content} and {parts} shapes)
    const normalizedMessages = messages
      .map((m: any) => {
        const role: "user" | "assistant" = m?.role === "assistant" ? "assistant" : "user";
        const content =
          typeof m?.content === "string"
            ? m.content
            : Array.isArray(m?.parts)
              ? m.parts
                  .map((p: any) => (typeof p?.text === "string" ? p.text : ""))
                  .filter(Boolean)
                  .join("\n")
              : "";
        return { role, content };
      })
      .filter((m: any) => typeof m.content === "string" && m.content.trim().length > 0);

    if (normalizedMessages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid messages" }, { status: 400 });
    }

    // Enhance the last user message with context (if provided)
    const enhancedMessages = [...normalizedMessages];
    if (enhancedMessages.length > 0 && enhancedMessages[enhancedMessages.length - 1].role === "user") {
      if (contextText) {
        enhancedMessages[enhancedMessages.length - 1] = {
          ...enhancedMessages[enhancedMessages.length - 1],
          content: `Context from document:\n"${contextText}"\n\nUser question: ${enhancedMessages[enhancedMessages.length - 1].content}`,
        };
      }
    } else {
      // If no user message, add a user message (with context if available)
      enhancedMessages.unshift({
        role: "user",
        content: contextText
          ? `Context from document:\n"${contextText}"\n\nUser question: ${
              (enhancedMessages[enhancedMessages.length - 1] as any)?.content || "Please analyze this text."
            }`
          : (enhancedMessages[enhancedMessages.length - 1] as any)?.content || "Please analyze this text.",
      });
    }

    // Select the model
    let model;
    if (provider === "anthropic") {
      model = anthropic(modelId);
    } else if (provider === "google") {
      model = google(modelId);
    } else {
      model = openai(modelId);
    }

    // Stream the response
    const result = streamText({
      model,
      system: systemPrompt,
      messages: enhancedMessages as any,
      maxTokens: 1000,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Dumby interrogate error:", error);
    
    const err = error as any;
    const nested = err?.lastError ?? err?.cause ?? err;
    const statusCode: number | undefined =
      typeof nested?.statusCode === "number"
        ? nested.statusCode
        : typeof err?.statusCode === "number"
          ? err.statusCode
          : 500;
    const message: string =
      typeof nested?.message === "string" && nested.message.trim().length > 0
        ? nested.message
        : "Failed to process interrogation request";

    return NextResponse.json(
      { error: message },
      { status: statusCode ?? 500 }
    );
  }
}

