# Feature Requirement Document: AI Provider & Model Selection for Dumbo & Dumby

## Feature Name
AI Provider & Model Selection for Dumbo & Dumby Tasks

## Goal
Enable users to select and alternate between different AI SDK providers (OpenAI, Google/Gemini, Anthropic) and specific models (e.g., Gemini 2.5 Flash, GPT-4o-mini, Claude 3.5 Sonnet) for Dumbo's and Dumby's related tasks. This provides flexibility to choose the best model for specific use cases, cost optimization, or performance preferences.

## User Story
As a user, I want to select which AI provider and model Dumbo and Dumby use for their tasks, so that I can optimize for cost, speed, quality, or specific capabilities (e.g., using Gemini 2.5 Flash for faster responses or GPT-4o for better reasoning).

## Functional Requirements

### 1. User Preference Storage
- The system must store user preferences for AI provider and model selection per agent (Dumbo, Dumby).
- Preferences must be stored in the database and persist across sessions.
- Each user can have separate preferences for:
  - **Dumbo** (chat/deadline tasks)
  - **Dumby** (interrogation/document analysis tasks)
- Default preferences should fall back to environment variables if no user preference exists.

### 2. Provider & Model Selection UI
- Add a settings/configuration UI accessible from the AgentChat component and DumbyInterrogationReader.
- The UI must display:
  - Current provider (OpenAI, Google, Anthropic)
  - Current model (e.g., "gpt-4o-mini", "gemini-2.5-flash", "claude-3-5-sonnet-latest")
  - A dropdown or selection interface to change provider/model
- The UI should show:
  - Available models per provider
  - Model capabilities/descriptions (optional but helpful)
  - Current selection highlighted
- Settings should be accessible via:
  - A gear/settings icon in the AgentChat header
  - A settings button in DumbyInterrogationReader
  - Or a unified settings panel

### 3. Supported Providers & Models
The system must support the following providers and their models:

#### OpenAI
- `gpt-4o-mini` (default)
- `gpt-4o`
- `gpt-4-turbo`
- `gpt-3.5-turbo`

#### Google (Gemini)
- `gemini-2.5-flash` (new, as requested)
- `gemini-1.5-flash` (current default for Dumbo)
- `gemini-1.5-pro`
- `gemini-3-flash-preview` (current default for Dumby)

#### Anthropic (Claude)
- `claude-3-5-sonnet-latest` (default)
- `claude-3-opus-latest`
- `claude-3-haiku-latest`

### 4. Backend API Changes
- Modify `/api/chat` route to:
  - Accept optional `provider` and `model` parameters in the request body
  - Check user preferences from database first
  - Fall back to request parameters if provided
  - Fall back to environment variables if neither exists
- Modify `/api/chat/dumby-interrogate` route similarly
- Both routes must validate:
  - Provider is one of: "openai", "google", "anthropic"
  - Model is a valid model ID for the selected provider
  - API keys are available for the selected provider

### 5. Preference Management API
- Create a new API route `/api/user/preferences` (or similar) to:
  - `GET`: Retrieve user's AI preferences
  - `POST/PUT`: Update user's AI preferences
- Preferences structure:
  ```typescript
  {
    dumbo: {
      provider: "google" | "openai" | "anthropic",
      model: string
    },
    dumby: {
      provider: "google" | "openai" | "anthropic",
      model: string
    }
  }
  ```

### 6. Error Handling
- If a user selects a provider/model but the API key is missing, show a clear error message:
  - "Missing API key for [Provider]. Please configure it in your environment or contact support."
- If a model is invalid for a provider, show:
  - "Model [model] is not available for [Provider]. Please select a different model."
- If API call fails due to provider issues, show:
  - "Failed to connect to [Provider]. Please try a different provider or check your API key."

### 7. Visual Feedback
- Display the current provider/model in the chat interface:
  - Small badge or text in the AgentChat header showing current selection
  - Tooltip or info icon explaining what model is being used
- When switching providers/models:
  - Show a brief loading state
  - Confirm the change with a toast notification (optional)

## Data Requirements

### New Database Table: `user_ai_preferences`
```sql
CREATE TABLE IF NOT EXISTS user_ai_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('dumbo', 'dumby')),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'google', 'anthropic')),
  model TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, agent_type)
);

CREATE INDEX IF NOT EXISTS idx_user_ai_preferences_user_id ON user_ai_preferences(user_id);
```

### Drizzle Schema Addition
Add to `app/lib/db/schema.ts`:
```typescript
export const userAiPreferences = pgTable(
  "user_ai_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    agentType: text("agent_type").notNull(), // 'dumbo' | 'dumby'
    provider: text("provider").notNull(), // 'openai' | 'google' | 'anthropic'
    model: text("model").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userAgentUnique: uniqueIndex("user_ai_preferences_user_agent_unique").on(table.userId, table.agentType),
  }),
);
```

## User Flow

### A. Setting Provider/Model Preference
1. User opens AgentChat (Dumbo) or DumbyInterrogationReader
2. User clicks settings/gear icon
3. Settings panel opens showing current provider/model
4. User selects a new provider from dropdown
5. Available models for that provider populate
6. User selects a model
7. User clicks "Save" or settings auto-save
8. Preference is stored in database
9. Next API call uses the new provider/model

### B. Using Different Models Per Agent
1. User sets Dumbo to use "Google" → "gemini-2.5-flash"
2. User sets Dumby to use "OpenAI" → "gpt-4o-mini"
3. When chatting with Dumbo, requests use Gemini 2.5 Flash
4. When using Dumby interrogation, requests use GPT-4o-mini
5. Each agent maintains its own preference independently

### C. Fallback Behavior
1. User has no preferences set
2. System checks environment variables (`DUMBO_CHAT_PROVIDER`, `DUMBO_CHAT_MODEL`, etc.)
3. If env vars exist, use those
4. If not, use hardcoded defaults (Google → gemini-1.5-flash for Dumbo, OpenAI → gpt-4o-mini for Dumby)

## Acceptance Criteria
1. ✅ User can view current provider/model selection in the UI
2. ✅ User can change provider/model for Dumbo independently from Dumby
3. ✅ Preferences persist across browser sessions
4. ✅ Backend API routes respect user preferences over environment variables
5. ✅ System falls back gracefully: User Preference → Request Parameter → Env Var → Default
6. ✅ Error messages are clear when API keys are missing or models are invalid
7. ✅ UI shows current provider/model selection in chat interfaces
8. ✅ Database schema supports storing preferences per user per agent
9. ✅ Gemini 2.5 Flash is available as an option for Google provider
10. ✅ Switching providers/models doesn't break existing chat sessions

## Edge Cases

### Missing API Keys
- If user selects OpenAI but `OPENAI_API_KEY` is not set:
  - Show error message immediately when saving preference
  - Or show warning but allow save, then error on first API call
  - Recommend: Show warning on save, error on API call

### Invalid Model Selection
- If user selects a model that doesn't exist for a provider:
  - Validate on save/preference update
  - Show dropdown with only valid models per provider
  - Prevent saving invalid combinations

### Provider Downtime
- If selected provider is down:
  - Show error message
  - Optionally suggest switching to another provider
  - Don't auto-switch (user should decide)

### Concurrent Preference Updates
- If user changes preference while a request is in flight:
  - Current request uses old preference
  - Next request uses new preference
  - No need to cancel in-flight requests

### Model Deprecation
- If a selected model is deprecated by provider:
  - System should detect and show warning
  - Suggest alternative models
  - Allow user to update preference

## Non-Functional Requirements

### Performance
- Preference lookup should be fast (<50ms)
- Cache user preferences in memory/session if possible
- Database query should use indexed `user_id` lookup

### Security
- Never expose API keys in UI or logs
- Validate user owns the preference being updated
- Sanitize model/provider inputs to prevent injection

### UX
- Settings UI should be intuitive and discoverable
- Model names should be human-readable where possible
- Show model capabilities/use cases if helpful (e.g., "Fast responses", "Better reasoning")

### Backward Compatibility
- Existing users without preferences should continue working with env vars/defaults
- No breaking changes to existing API contracts
- Environment variables remain as fallback

## Implementation Notes

### Files to Modify
1. **Database Schema**
   - `schema.sql` - Add `user_ai_preferences` table
   - `app/lib/db/schema.ts` - Add Drizzle schema definition

2. **Backend API Routes**
   - `app/api/chat/route.ts` - Add preference lookup, accept provider/model params
   - `app/api/chat/dumby-interrogate/route.ts` - Add preference lookup, accept provider/model params
   - `app/api/user/preferences/route.ts` - New route for preference CRUD

3. **Frontend Components**
   - `app/components/AgentChat.tsx` - Add settings UI, display current provider/model
   - `app/components/DumbyInterrogationReader.tsx` - Add settings UI, display current provider/model
   - `app/components/ui/AiProviderSelector.tsx` - New reusable component for provider/model selection

4. **Server Actions/Utilities**
   - `app/actions/userPreferences.ts` - New server actions for preference management
   - `app/lib/ai/getUserPreferences.ts` - New utility to fetch user preferences with caching

### Model Validation
Create a mapping of valid models per provider:
```typescript
const VALID_MODELS = {
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  google: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-3-flash-preview'],
  anthropic: ['claude-3-5-sonnet-latest', 'claude-3-opus-latest', 'claude-3-haiku-latest']
};
```

### Default Behavior
- If no user preference exists:
  - Dumbo: Check `DUMBO_CHAT_PROVIDER` / `DUMBO_CHAT_MODEL` → Default to Google / gemini-1.5-flash
  - Dumby: Check `DUMBY_INTERROGATE_PROVIDER` / `DUMBY_INTERROGATE_MODEL` → Default to OpenAI / gpt-4o-mini

