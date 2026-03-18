import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

const DUMBY_SUBAGENT_MODEL = "claude-haiku-4-5-20251001";

type InterrogateIntent = "EXPLAIN" | "CRITIQUE" | "GENERAL";

function buildSystemPrompt(intent: InterrogateIntent, documentTitle?: string): string {
  const docInfo = documentTitle ? ` You are currently analyzing the document: "${documentTitle}".` : "";
  const basePersona = `You are Dumby, an efficient Knowledge Manager.${docInfo} You have access to a "Focused Context" snippet from the document, which the user has highlighted or clicked.`;

  switch (intent) {
    case "EXPLAIN":
      return `${basePersona} Your role is to simplify jargon and complex concepts from the "Focused Context" using ELI5 (Explain Like I'm 5) style. Break down technical terms and complex ideas into simple, clear explanations.`;
    case "CRITIQUE":
      return `${basePersona} Your role is to critically analyze claims within the "Focused Context" and check for logical fallacies, vague language, or unsupported assertions. Point out weaknesses but also acknowledge strengths.`;
    case "GENERAL":
      return `${basePersona} Answer the user's questions about the "Focused Context" snippet. Be concise and accurate.`;
    default:
      return basePersona;
  }
}

export interface CallDumbyInput {
  query: string;
  documentContext?: string;
  intent?: InterrogateIntent;
  documentTitle?: string;
  userId: string;
}

export interface CallDumbyResult {
  response: string;
}

/**
 * Execute Dumby's document interrogation logic as a server-side function.
 * Uses generateText (not streaming) so tool results are complete.
 */
export async function callDumbyLogic({
  query,
  documentContext,
  intent = "GENERAL",
  documentTitle,
}: CallDumbyInput): Promise<CallDumbyResult> {
  const systemPrompt = buildSystemPrompt(intent, documentTitle);

  let userContent = query;
  if (documentContext && documentContext.trim()) {
    userContent = `Context from document:\n"${documentContext.trim()}"\n\nUser question: ${query}`;
  }

  const { text } = await generateText({
    model: anthropic(DUMBY_SUBAGENT_MODEL),
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
    maxOutputTokens: 1000,
  });

  return { response: text };
}
