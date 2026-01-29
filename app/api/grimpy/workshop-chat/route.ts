import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type Idea = {
  id: string;
  content: string;
  imageUrl?: string;
};

type WorkshopChatBody = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  ideas: Idea[];
  projectId?: string;
};

const GRIMPY_SYSTEM_PROMPT = `You are Grimpy, the Ancient Architect of the Deep. You are conducting a workshop session to help transform the user's raw ideas into a structured project plan.

Your personality:
- Wise, cryptic, but helpful
- Speak like an ancient architect from the deep sea
- Use metaphors of the deep ocean when appropriate
- Minimalist but profound

Your approach:
1. FIRST, when ideas are shared, acknowledge them briefly. Summarize what you see.
2. ASK QUESTIONS to understand the project better:
   - What is the main goal?
   - What constraints exist (time, resources)?
   - What timeline makes sense (daily, weekly, monthly, quarterly, or phases)?
3. After gathering enough context (2-3 questions usually), tell the user you're ready to generate their plan.
4. BE CONVERSATIONAL — this is a dialogue, not a form submission.

Important guidelines:
- Keep responses concise but meaningful (2-4 sentences typically)
- Don't overwhelm with too many questions at once
- Guide the user naturally toward planning
- When you have enough context, say something like "I'm ready to forge your plan. Click the Generate Plan button when you're ready."
- Don't try to output the plan yourself - the Generate Plan button will do that`;

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<WorkshopChatBody>;
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const ideas = Array.isArray(body.ideas) ? body.ideas : [];

    if (rawMessages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    // Build context with ideas
    let ideasContext = "";
    if (ideas.length > 0) {
      ideasContext = `\n\nThe user has shared the following ideas for this workshop:\n${ideas.map((idea, i) => `${i + 1}. ${idea.content}`).join("\n")}\n\nUse these ideas as the foundation for planning.`;
    }

    const systemPrompt = GRIMPY_SYSTEM_PROMPT + ideasContext;

    // Get API key
    const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;
    if (!openrouterKey) {
      return NextResponse.json({ error: "Missing OpenRouter API key" }, { status: 500 });
    }

    // Build messages for OpenRouter
    const messages = [
      { role: "system", content: systemPrompt },
      ...rawMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    console.log(`[Grimpy Chat] Sending ${messages.length} messages to OpenRouter`);

    // Call OpenRouter directly using chat completions API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openrouterKey}`,
        "HTTP-Referer": process.env.BETTER_AUTH_URL || "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", errorText);
      return NextResponse.json(
        { error: `OpenRouter error: ${response.status}` },
        { status: response.status }
      );
    }

    // Stream the response back
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    // Send in AI SDK streaming format
                    controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Workshop chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process chat" },
      { status: 500 }
    );
  }
}
