# Feature Requirement Document: Xiaomi mimo-v2-flash SDK in Mascot Agent Chat

## Feature Name
Xiaomi mimo-v2-flash SDK Integration with Model Switching in Mascot Agent Chat

## Goal
Embed the Xiaomi mimo-v2-flash model via the OpenRouter API in the mascot agent chat experience and allow users to switch between multiple AI models via a user-facing dropdown, while routing all credentials through backend environment secrets.

## User Story
As a user, I want to choose which AI model the mascot agent chat uses (including Xiaomi mimo-v2-flash and other providers), so that I can balance speed, quality, and cost for different tasks.

## Functional Requirements

### 1. SDK Integration (Backend + Frontend)
- Backend must support Xiaomi mimo-v2-flash requests via the OpenRouter API using credentials sourced from backend environment variables.
- Frontend must expose a model-selection UI in the mascot agent chat.
- Requests from the chat must include the selected provider/model and be routed to the correct SDK on the backend.

### 2. Provider & Model Selection UI
- Add a dropdown in mascot agent chat for model selection.
- UI must show the current selection and allow switching before sending a message.
- The selection must be persisted per user (or per session if no user account is available).

### 3. Supported Providers & Models
The dropdown must include these models:

#### Google (Gemini)
- `gemini-2.5`
- `gemini-3.0-flash`

#### OpenAI
- `gpt-4o`
- `gpt-4o-mini`

#### OpenRouter (or equivalent aggregator)
- `xiaomi/mimo-v2-flash`
- `allenai/molmo-2-8b:free`

### 4. Routing & Fallback Behavior
- Backend must validate provider/model pairs and route the request to the correct SDK.
- If the selected model is unavailable, fallback to the last known valid selection for that user.
- If no preference exists, fallback to the current default model used by mascot agent chat.

### 5. Credentials & Security
- OpenRouter and other provider API keys must be read from backend environment variables only.
- No API keys or secrets should be exposed to the frontend or client logs.

### 6. Error Handling
- If required credentials are missing, the backend must return a clear error message.
- If a provider is unreachable or times out, the user must see a user-friendly error prompt.
- Invalid model/provider selections must be rejected with a descriptive message.

### 7. Telemetry (Optional)
- Log model selection changes (anonymized) for product analytics.
- Log provider errors for debugging and monitoring.

## Data Requirements
- Store model selection preferences per user (or per session if unauthenticated).
- If a preferences table already exists, extend it to include Xiaomi and any new providers.
- If no preference storage exists, create a table similar to:
  - `user_ai_preferences(user_id, provider, model, updated_at)`

## User Flow
1. User opens mascot agent chat.
2. User opens the model dropdown.
3. User selects a provider/model (e.g., Xiaomi mimo-v2-flash).
4. User sends a message.
5. Backend routes the request to the selected provider.
6. User receives the response.
7. The selection persists for future messages.

## Acceptance Criteria
1. Xiaomi mimo-v2-flash appears in the model dropdown.
2. User can switch between the specified models without leaving the chat.
3. Backend routes requests to the chosen provider/model reliably.
4. Missing API keys return a clear, actionable error.
5. No secrets are exposed in frontend code or network responses.
6. Selection persists across page reloads (or per session if unauthenticated).
7. Default behavior remains unchanged when no selection is made.

## Edge Cases
- User selects a model with missing credentials.
- Provider rate limits or temporary outages.
- Model is removed or deprecated by a provider.
- User switches models while a request is in-flight.
- Preference storage is unavailable; fallback to default.

## Non-Functional Requirements

### Performance
- Model switching should not add more than 100ms overhead to request routing.
- Preference lookup should be optimized with caching or indexed storage.

### Security
- Enforce server-side validation of provider/model.
- Never send or store API keys in the client.

### UX
- Dropdown should be easily discoverable and indicate the current model.
- Show a brief status indicator when switching models.

