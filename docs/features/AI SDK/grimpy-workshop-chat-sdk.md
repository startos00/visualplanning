# Feature Requirement Document: Grimpy Workshop Chat — Embedded AI SDK Tool

## Feature Name
Grimpy Workshop Chat — Embedded AI SDK Tool

## Goal
Enable **real-time conversational AI** within the Grimpy Workshop by embedding streaming chat capabilities. Users can have an interactive dialogue with Grimpy, submit ideas from the Thought Pool, and receive structured plans through natural conversation rather than a rigid form-based workflow.

## Problem Statement
The current Workshop implementation uses a form-based approach where users:
1. Select ideas
2. Pick a timeline
3. Submit for generation

This lacks the **interactive interview experience** promised in the feature spec. Users cannot:
- Converse naturally with Grimpy
- Ask clarifying questions
- Receive follow-up prompts
- Submit ideas mid-conversation
- Get real-time feedback on their plans

## User Story
As a user, I want to have a real conversation with Grimpy where I can describe my ideas naturally, answer his interview questions, and collaboratively develop a project plan — rather than filling out a form and waiting for a one-shot response.

## Technical Approach

### Implementation Architecture
Due to AI SDK v6 compatibility issues with OpenRouter's API (incorrect endpoint routing), the implementation uses a **hybrid approach**:

1. **Chat Streaming**: Direct fetch to OpenRouter's `/api/v1/chat/completions` with manual SSE parsing
2. **Plan Generation**: Vercel AI SDK's `generateObject` for structured output

### Provider Selection
**OpenRouter** is the primary provider for cost-efficiency and reliability:
- Model: `google/gemini-2.0-flash-001` (~$0.10/1M tokens)
- Fallback models: `anthropic/claude-3-5-haiku`, `openai/gpt-4o-mini`

### Streaming Response Pattern
```typescript
// Client-side: Manual SSE parsing
const response = await fetch("/api/grimpy/workshop-chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages, ideas, projectId }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();
let fullContent = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split("\n");

  for (const line of lines) {
    if (line.startsWith("0:")) {
      const text = JSON.parse(line.slice(2));
      fullContent += text;
      setStreamingContent(fullContent);
    }
  }
}
```

## Functional Requirements

### 1. Embedded Chat Interface
- Chat panel embedded within the Workshop modal/panel
- Message bubbles for user and Grimpy
- Streaming text display for Grimpy's responses
- Input field with send button (Enter to send, Shift+Enter for newline)
- Typing indicator when Grimpy is responding

### 2. Idea Submission to Chat
- **"Send to Grimpy"** button on each idea card in Thought Pool
- Clicking sends the idea content (text or image) into the chat
- Image ideas are displayed inline in the chat
- Multiple ideas can be sent sequentially
- Batch send: select multiple ideas → "Send All to Grimpy"

### 3. Grimpy Interview Flow (Conversational)
Grimpy conducts a natural interview through conversation:

```
GRIMPY_SYSTEM_PROMPT = `You are Grimpy, the Ancient Architect of the Deep.
You are conducting a workshop session to help transform the user's raw ideas
into a structured project plan.

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
3. After gathering enough context (2-3 questions usually), tell the user
   you're ready to generate their plan.
4. BE CONVERSATIONAL — this is a dialogue, not a form submission.

Important guidelines:
- Keep responses concise but meaningful (2-4 sentences typically)
- Don't overwhelm with too many questions at once
- Guide the user naturally toward planning
- When you have enough context, say something like "I'm ready to forge your
  plan. Click the Generate Plan button when you're ready."
- Don't try to output the plan yourself - the Generate Plan button will do that`
```

### 4. Conversation Context Management
- Chat history persisted during session
- Ideas added to conversation context automatically
- Grimpy remembers previous answers in the interview
- User can reference earlier messages ("like I said earlier...")

### 5. Plan Generation in Chat
- Timeline selector appears after 2+ messages exchanged
- User clicks "Generate Plan" when ready
- Plan preview displayed inline in chat (collapsible)
- "Apply to Canvas" button appears after plan generation
- **"Keep ideas in Thought Pool" checkbox** (checked by default) lets user choose whether to retain ideas after applying plan
- User can have follow-up conversation to refine requirements

### 6. Image/Sketch Understanding
- Use vision-capable model (Gemini, GPT-4o) for image understanding
- Grimpy can "see" uploaded sketches and whiteboard photos
- Grimpy describes what he sees and asks clarifying questions
- Image context feeds into plan generation

## API Endpoints

### `/api/grimpy/workshop-chat/route.ts` (Streaming Chat)

```typescript
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/app/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type WorkshopChatBody = {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  ideas: Array<{ id: string; content: string; imageUrl?: string }>;
  projectId?: string;
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as Partial<WorkshopChatBody>;
  const messages = body.messages || [];
  const ideas = body.ideas || [];

  // Build context with ideas
  let ideasContext = "";
  if (ideas.length > 0) {
    ideasContext = `\n\nThe user has shared the following ideas:\n${
      ideas.map((idea, i) => `${i + 1}. ${idea.content}`).join("\n")
    }\n\nUse these ideas as the foundation for planning.`;
  }

  const systemPrompt = GRIMPY_SYSTEM_PROMPT + ideasContext;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

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
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
    }),
  });

  // Stream response with AI SDK-compatible format
  const stream = new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              // Send in format: 0:"text content"\n
              controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
            }
          }
        }
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

### `/api/grimpy/workshop-plan/route.ts` (Structured Plan Generation)

```typescript
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

// Schema for structured output - all fields required for OpenAI/Google compatibility
const planSchema = z.object({
  strategy: z.object({
    title: z.string(),
    description: z.string(),
  }),
  milestones: z.array(
    z.object({
      title: z.string(),
      targetDate: z.string().describe("Target date or empty string"),
      description: z.string().describe("Description or empty string"),
    })
  ),
  tactics: z.array(
    z.object({
      title: z.string(),
      description: z.string().describe("Description or empty string"),
      deadline: z.string().describe("Deadline like 'Day 1', 'Week 1' or empty string"),
    })
  ),
  timeline: z.object({
    type: z.enum(["daily", "weekly", "monthly", "quarterly", "phases"]),
    startDate: z.string().describe("Start date or empty string"),
    phases: z.array(z.object({ name: z.string(), duration: z.string() })),
  }),
  summary: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { ideas, timelineType, context, projectId } = body;

  const openrouterKey = process.env.OPENROUTER_API_KEY;

  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: openrouterKey,
    compatibility: "compatible", // Use chat completions API
  });

  const model = openrouter("google/gemini-2.0-flash-001");

  const { object } = await generateObject({
    model,
    schema: planSchema,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  return NextResponse.json(object);
}
```

## UI Components

### 1. GrimpyWorkshopChat Component

```tsx
type GrimpyWorkshopChatProps = {
  ideas: Idea[];
  projectId: string;
  onPlanGenerated: (plan: WorkshopPlan, keepIdeas: boolean) => void;
  onClose: () => void;
  theme?: "abyss" | "surface";
};

function GrimpyWorkshopChat({ ideas, projectId, onPlanGenerated, onClose, theme }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState<WorkshopPlan | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineType>("weekly");

  // Send message with manual streaming
  const sendMessage = async (content: string) => {
    const userMessage = { id: `user-${Date.now()}`, role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const response = await fetch("/api/grimpy/workshop-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        ideas: ideas.map(i => ({ id: i.id, content: i.content })),
        projectId,
      }),
    });

    // Parse SSE stream manually
    const reader = response.body?.getReader();
    // ... streaming logic
  };

  // Generate plan using workshop-plan endpoint
  const handleGeneratePlan = async () => {
    const res = await fetch("/api/grimpy/workshop-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ideas,
        timelineType: selectedTimeline,
        context: { goal: extractContextFromConversation() },
        projectId,
      }),
    });
    const plan = await res.json();
    setGeneratedPlan(plan);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.map(m => <ChatBubble key={m.id} message={m} />)}
        {streamingContent && <StreamingBubble content={streamingContent} />}
        {isLoading && !streamingContent && <TypingIndicator />}
        {generatedPlan && <PlanPreview plan={generatedPlan} onApply={handleApply} />}
      </div>

      {/* Timeline selector + Generate Plan button */}
      {messages.length >= 2 && !generatedPlan && (
        <TimelineSelector
          selected={selectedTimeline}
          onSelect={setSelectedTimeline}
          onGenerate={handleGeneratePlan}
        />
      )}

      {/* Input area */}
      <ChatInput value={input} onSubmit={handleSubmit} disabled={isLoading} />
    </div>
  );
}
```

### 2. Idea Injection Button

```tsx
function IdeaCard({ idea, onSendToGrimpy }: Props) {
  return (
    <div className="idea-card">
      <p>{idea.content}</p>
      <button onClick={() => onSendToGrimpy(idea)}>
        <Send className="w-4 h-4" />
        Send to Grimpy
      </button>
    </div>
  );
}
```

### 3. Inline Plan Preview

```tsx
function PlanPreview({ plan, onApply, theme }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [keepIdeas, setKeepIdeas] = useState(true); // Default: keep ideas

  return (
    <div className="plan-preview">
      <div className="plan-header" onClick={() => setExpanded(!expanded)}>
        <Sparkles className="h-4 w-4" />
        <h4>{plan.strategy.title}</h4>
        {expanded ? <ChevronUp /> : <ChevronDown />}
      </div>

      {expanded && (
        <div className="plan-details">
          <p>{plan.strategy.description}</p>

          {plan.milestones.length > 0 && (
            <div className="milestones">
              {plan.milestones.map(m => <span key={m.title}>{m.title}</span>)}
            </div>
          )}

          <div className="tactics">
            {plan.tactics.map((t, i) => (
              <div key={i} className="tactic-item">
                <span className="number">{i + 1}</span>
                <span>{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User choice: keep or archive ideas */}
      <label className="keep-ideas-checkbox">
        <input
          type="checkbox"
          checked={keepIdeas}
          onChange={(e) => setKeepIdeas(e.target.checked)}
        />
        Keep ideas in Thought Pool
      </label>

      <button onClick={() => onApply(keepIdeas)} className="apply-button">
        <CheckCircle className="h-4 w-4" />
        Apply to Canvas
      </button>
    </div>
  );
}
```

## Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Thought Pool   │────▶│  Workshop Chat   │────▶│     Canvas      │
│   (Ideas)       │     │  (Conversation)  │     │  (Nodes/Edges)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        ▲
        │   "Send to Grimpy"    │                        │
        └───────────────────────┤                        │
                                │                        │
                    ┌───────────┴───────────┐            │
                    │                       │            │
                    ▼                       ▼            │
        ┌─────────────────────┐  ┌──────────────────┐   │
        │ /workshop-chat      │  │ /workshop-plan   │   │
        │ (Direct Fetch SSE)  │  │ (AI SDK Object)  │───┘
        │ OpenRouter API      │  │ generateObject() │
        └─────────────────────┘  └──────────────────┘
```

## Conversation Example

```
[User sends 3 ideas to Grimpy]

GRIMPY: Ah, I sense the stirrings of creation in the depths. You've brought
        me three currents of thought:
        1. "Build a landing page with email capture"
        2. "Set up analytics tracking"
        3. "Launch to Product Hunt"

        These form the skeleton of a launch. Tell me, Seeker — what creature
        are you bringing to the surface? What is this product?

USER: It's a productivity app for writers. I want to launch in 2 weeks.

GRIMPY: A tool for the scribes... I see the vision. Two weeks is a swift
        current. I recommend a WEEKLY breakdown — enough structure without
        drowning in detail.

        Before I architect your plan, one question: Do you have the landing
        page designed already, or does that need to be created from nothing?

USER: I have a rough Figma mockup

GRIMPY: Excellent. The foundation exists. I'm ready to forge your plan.
        Select your timeline and click Generate Plan when you're ready.

[User selects "Weekly" and clicks "Generate Plan"]

[Plan appears inline in chat]

📋 LAUNCH PLAN: "Writer's Companion - 2 Week Sprint"

Week 1: Build
• Convert Figma to code (Day 1-2)
• Implement email capture with Resend (Day 3)
• Set up Plausible analytics (Day 4)
• Internal testing (Day 5)

Week 2: Launch
• Polish and bug fixes (Day 1-2)
• Prepare PH assets (Day 3)
• Soft launch to waitlist (Day 4)
• Product Hunt launch (Day 5)

[Apply to Canvas]
```

## Acceptance Criteria

- [x] Chat interface embedded in Workshop modal with streaming responses
- [x] Users can send individual ideas to Grimpy via "Send to Grimpy" button
- [x] Grimpy acknowledges received ideas in conversation
- [x] Grimpy asks clarifying questions naturally (not as a form)
- [x] Conversation context persists throughout the session
- [x] Timeline selector appears after initial conversation exchange
- [x] Plan generation happens via dedicated endpoint with structured output
- [x] Plan preview displayed inline in chat with expand/collapse
- [x] "Apply to Canvas" button spawns nodes from the generated plan
- [x] "Keep ideas in Thought Pool" checkbox gives user control over idea retention
- [x] Streaming responses show Grimpy "typing" in real-time
- [x] Error states handled gracefully (API failures, timeouts)
- [x] Theme support (Abyss/Surface)
- [ ] Batch send multiple selected ideas
- [ ] Image/sketch ideas with vision model understanding
- [ ] Users can request plan modifications through follow-up conversation

## Edge Cases

- **Empty conversation start**: Grimpy prompts user to share ideas or describe their project
- **Image-only ideas**: Grimpy uses vision to understand and asks for text clarification if needed
- **User goes off-topic**: Grimpy gently steers back to planning
- **Very long conversations**: Summarize and compress older context to stay within token limits
- **API timeout**: Show retry option; preserve conversation state
- **User closes mid-conversation**: State is not persisted (future enhancement)

## Non-Functional Requirements

- **Latency**: First token should appear within 500ms of send
- **Streaming**: Smooth token-by-token rendering without jank
- **Mobile**: Chat interface should work on mobile viewports
- **Accessibility**: Keyboard navigation, screen reader support for messages
- **Theme**: Chat bubbles styled to match Abyss/Surface themes

## Dependencies

- `ai` (Vercel AI SDK) - for `generateObject` structured output
- `@ai-sdk/openai` - for OpenRouter provider configuration
- `zod` - for schema definition
- OpenRouter API key (`OPENROUTER_API_KEY`)
- Existing Thought Pool components for idea injection

## Technical Notes

### Why Direct Fetch Instead of AI SDK for Chat?
The Vercel AI SDK v6's streaming chat (`useChat`, `Chat`, `DefaultChatTransport`) routes to `/api/v1/responses` endpoint which OpenRouter doesn't support. The `compatibility: "compatible"` option doesn't fix this for streaming chat. Direct fetch to `/api/v1/chat/completions` with manual SSE parsing works reliably.

### Why AI SDK for Plan Generation?
The `generateObject` function works correctly with OpenRouter when using `compatibility: "compatible"`. It uses the chat completions endpoint and provides type-safe structured output with Zod schema validation.

### Schema Requirements for Structured Output
All fields in the Zod schema must be **required** (not `.optional()`) for compatibility with OpenAI/Google structured outputs. Use `.describe("empty string if not applicable")` pattern for optional-like behavior.

## Related Documents

- [Idea Dump — Thought Pool](../Schema%20Database/idea-dump-thought-pool.md)
- [GRIMPO AI Agents](./grimpo-ai-agents-deep-sea-hierarchy.md)
- [AI Provider Selection](./ai-provider-model-selection.md)
