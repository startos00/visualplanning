import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { db } from "@/app/lib/db";
import { grimpoStates } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkDeadlines } from "@/app/lib/ai/tools/checkDeadlines";

export const runtime = "nodejs";

function getProvider() {
  const raw = (process.env.DUMBO_CHAT_PROVIDER || process.env.DUMBY_INTERROGATE_PROVIDER || "openai").trim().toLowerCase();
  if (raw === "anthropic") return "anthropic";
  if (raw === "google") return "google";
  return "openai";
}

function getModelId(provider: string): string {
  const raw = process.env.DUMBO_CHAT_MODEL?.trim() || process.env.DUMBY_INTERROGATE_MODEL?.trim();
  if (raw) return raw;
  
  if (provider === "anthropic") return "claude-3-5-sonnet-latest";
  if (provider === "google") return "gemini-1.5-flash";
  return "gpt-4o-mini";
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, agent = "dumbo" } = await request.json();

    let systemPrompt = "";
    let tools: any = {};

    if (agent === "dumbo") {
      systemPrompt = `You are Dumbo, an eager Dumbo Octopus intern in the Abyssal Zone. You love helping with small tasks. You speak cheerfully and use aquatic puns or emojis where appropriate (e.g., 🐙, 🌊, ✨). 
      
      Your main job is to track deadlines, keep the user happy, and break through inertia. 
      When asked about deadlines, always use the 'checkDeadlines' tool. 
      If the user is stressed, offer to dance. 
      If they are stuck, suggest a 'Dive' with the Oxygen Tank.
      
      Maintain your helpful intern persona at all times!`;
      
      tools = {
        checkDeadlines: {
          description: "Scan all nodes for explicit deadline fields and/or date-like text in titles/notes.",
          parameters: z.object({}),
          execute: async () => {
            const userId = session.user.id;
            const state = await db
              .select({ nodes: grimpoStates.nodes })
              .from(grimpoStates)
              .where(eq(grimpoStates.userId, userId))
              .limit(1);

            const nodes = (state[0]?.nodes as any[]) || [];
            return await checkDeadlines(nodes);
          },
        },
      };
    }

    const provider = getProvider();
    const modelId = getModelId(provider);

    let model;
    if (provider === "anthropic") {
      model = anthropic(modelId);
    } else if (provider === "google") {
      model = google(modelId);
    } else {
      model = openai(modelId);
    }

    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
    });

    // DefaultChatTransport expects the UI message streaming protocol.
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}

