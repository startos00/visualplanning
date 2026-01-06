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
  documentTitle?: string;
};

function buildSystemPrompt(intent: InterrogateIntent, documentTitle?: string): string {
  const docInfo = documentTitle ? ` You are currently analyzing the document: "${documentTitle}".` : "";
  const basePersona = `You are Dumby, an efficient Knowledge Manager.${docInfo} You have access to a "Focused Context" snippet from the document, which the user has highlighted or clicked.`;
  
  switch (intent) {
    case "EXPLAIN":
      return `${basePersona} Your role is to simplify jargon and complex concepts from the "Focused Context" using ELI5 (Explain Like I'm 5) style. Break down technical terms and complex ideas into simple, clear explanations. If the user's question isn't directly related to the snippet, answer using your general knowledge but mention that it wasn't in the specific focused section.`;
    
    case "CRITIQUE":
      return `${basePersona} Your role is to critically analyze claims within the "Focused Context" and check for logical fallacies, vague language, or unsupported assertions. Point out weaknesses but also acknowledge strengths. If the user asks about something else, clarify that you are focusing on the specific section of "${documentTitle || "the document"}" they have focused on.`;
    
    case "GENERAL":
      return `${basePersona} Answer the user's questions about the "Focused Context" snippet. Be concise and accurate. If the user asks about something not in the snippet, use your general knowledge but clarify that this info wasn't in the specific highlighted section of "${documentTitle || "the document"}". You represent an assistant that is actively reading this document with the user and sees exactly what they focus on.`;
    
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
    const { messages, context, intent, documentTitle } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid messages" }, { status: 400 });
    }

    const contextText = typeof context === "string" ? context.trim() : "";
    console.log(`Dumby Interrogate: document="${documentTitle}", contextLength=${contextText.length}, intent=${intent}`);

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
    const systemPrompt = buildSystemPrompt(validIntent, documentTitle);

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
    const lastMessage = enhancedMessages[enhancedMessages.length - 1];

    if (lastMessage.role === "user") {
      if (contextText) {
        enhancedMessages[enhancedMessages.length - 1] = {
          ...lastMessage,
          content: `Context from document:\n"${contextText}"\n\nUser question: ${lastMessage.content}`,
        };
      }
    } else {
      // If the last message is from the assistant, append a new user message
      // so the model has something to respond to.
      enhancedMessages.push({
        role: "user",
        content: contextText
          ? `Context from document:\n"${contextText}"\n\nPlease analyze this section.`
          : "Please continue your analysis.",
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
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: enhancedMessages as any,
      // AI SDK v6 uses `maxOutputTokens` (not `maxTokens`)
      maxOutputTokens: 1000,
    });

    // Return UI message stream response - this is what useChat expects
    return result.toUIMessageStreamResponse();
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

