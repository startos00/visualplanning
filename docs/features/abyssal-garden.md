# Feature Requirement Document (FRED): The Abyssal Garden

## Feature Name
The Abyssal Garden

## Goal
Introduce an MVP-friendly, “Neon/Deep Sea” gamification layer where completing tasks earns a **spendable currency** and expands a **shop inventory** of premium-looking, non-cartoon **bioluminescent light-and-glass sculptures**. Users can **purchase multiple items**, then **drag/drop** them onto a seabed canvas to decorate their Abyssal Garden. All progression and the garden layout persist locally without backend dependencies.

## User Story
As a user completing planning tasks, I want to unlock beautiful deep-sea decorations that appear in my app, so that I feel rewarded and motivated to keep completing tasks.

## Functional Requirements
- **Progress counter (lifetime unlocks)**
  - The app tracks a single lifetime integer counter named **`swallowedCount`** in **`localStorage`**.
  - `swallowedCount` represents the cumulative number of tasks the user has completed (as defined by the app’s “task completion” event).
  - `swallowedCount` must never be negative.
  - If `localStorage.swallowedCount` is missing or invalid, the app initializes it to `0`.

- **Currency balance (spendable)**
  - The app tracks a spendable integer balance named **`abyssalCurrency`** in **`localStorage`**.
  - `abyssalCurrency` is the user’s currency used to **purchase** decorations.
  - `abyssalCurrency` must never be negative.
  - If `localStorage.abyssalCurrency` is missing or invalid, the app initializes it to `0`.

- **Earn behavior**
  - When a user completes a task, increment `swallowedCount` by `1`.
  - When a user completes a task, also increment `abyssalCurrency` by `1`.
  - Reverting/uncompleting a task does **not** decrement `swallowedCount` or `abyssalCurrency` in MVP (prevents oscillation/exploit complexity). If the product currently supports “undo complete,” it should not affect lifetime progress or currency.

- **Unlock tiers (availability in shop)**
  - Unlocks are based on the value of `swallowedCount` reaching or exceeding thresholds and determine which items are available to purchase:
    - **1** task: unlock **“Abyssal Rock”** (Base decoration)
    - **5** tasks: unlock **“Neon Sandcastle”** (Structure)
    - **10** tasks: unlock **“Crystalline Spire”** (The Glass Castle)
    - **20** tasks: unlock **“Siren’s Tail”** (The Mermaid)
    - **50** tasks: unlock **“The Lost Bounty”** (Treasure Chest)
  - Unlocks are monotonic: once unlocked, always unlocked.

- **Item costs (MVP)**
  - Each decoration has a fixed cost in `abyssalCurrency`:
    - Abyssal Rock: **1**
    - Neon Sandcastle: **5**
    - Crystalline Spire: **10**
    - Siren’s Tail: **20**
    - The Lost Bounty: **50**
  - Costs are shown in the shop UI before purchase.

- **Purchasing**
  - If an item is unlocked and the user has enough `abyssalCurrency`, they can purchase it.
  - Purchasing an item:
    - decrements `abyssalCurrency` by the item cost
    - increments the user’s owned quantity (inventory) of that item by `1`
  - The user can purchase multiple copies of items (e.g., **5 rocks and 1 sandcastle**), as long as they can afford them.
  - The app must prevent purchases that would cause `abyssalCurrency` to go negative.

- **Inventory**
  - The app maintains an inventory of owned items and quantities (e.g., “Abyssal Rock × 5”).
  - Inventory is persisted locally.

- **Decorate the seabed canvas (placement)**
  - The Abyssal Garden includes a **seabed canvas** the user can decorate.
  - The user can select an owned item from inventory and **drag/drop** it onto the seabed canvas to place it.
  - Placing an item:
    - decreases that item’s inventory quantity by `1`
    - creates a placed instance in the garden layout with a unique id and position data
  - The user can select a placed item and:
    - move it (drag to reposition)
    - remove it from the canvas (returns it to inventory in MVP)
  - The garden layout persists across refreshes.

- **Presentation / where rewards appear**
  - The app presents an “Abyssal Garden” area/section where unlocked items are visible.
  - Items are shown as **sculptural bioluminescent objects constructed from light and glass**, aligned with the existing “Neon/Deep Sea” aesthetic.
  - Items should not be rendered as cartoonish icons (no flat outlines, chibi proportions, or playful sticker-like styling).

- **New unlock feedback**
  - When a tier is crossed (e.g., `swallowedCount` becomes 5), the app should clearly indicate the new unlock (e.g., toast/modal/celebration panel).
  - The feedback should include:
    - unlocked item name
    - a short descriptor (Base decoration / Structure / etc.)
    - a preview/thumbnail consistent with the aesthetic

- **Reset behavior (MVP policy)**
  - By default, there is **no user-facing reset** of `swallowedCount` in MVP.
  - If developers need a reset for testing, it should be gated behind a dev-only flag/tooling (not exposed in production UI).

## Data Requirements (Optional)
- **Storage**: `localStorage`
  - Key: `swallowedCount`
  - Type: stringified integer (e.g., `"12"`)
  - Validation:
    - parse as base-10 integer
    - invalid → treat as 0
    - clamp to min 0
  - Key: `abyssalCurrency`
  - Type: stringified integer (e.g., `"12"`)
  - Validation:
    - parse as base-10 integer
    - invalid → treat as 0
    - clamp to min 0
  - Key: `abyssalInventory`
  - Type: JSON object map of itemId → quantity (e.g., `{"abyssal-rock": 5, "neon-sandcastle": 1}`)
  - Validation:
    - invalid/missing → treat as empty inventory
    - quantities clamp to min 0
  - Key: `abyssalGardenLayout`
  - Type: JSON array of placed items, each with:
    - `id` (unique string)
    - `itemId` (e.g., `"abyssal-rock"`)
    - `x`, `y` (canvas coordinates, numbers)
    - optional: `zIndex` / `layer` (number) for render order
  - Validation:
    - invalid/missing → treat as empty layout
    - discard entries with unknown itemId or invalid coordinates

## User Flow
1. User completes a task in the planner.
2. App increments `localStorage.swallowedCount` and `localStorage.abyssalCurrency`.
3. App checks unlock thresholds against the new `swallowedCount`.
4. If a threshold has just been reached (new shop item becomes available):
   - show an unlock notification/celebration
5. User navigates (or is guided) to the Abyssal Garden section.
6. User opens the shop, sees available items and costs, and purchases one or more items (currency decreases; inventory increases).
7. User selects an owned item from inventory and drags it onto the seabed canvas to place it (inventory decreases; layout updates).
8. User repositions or removes placed items (remove returns to inventory in MVP).

## Acceptance Criteria
- **Counter persistence**
  - After completing N tasks, refreshing the page preserves `swallowedCount`, `abyssalCurrency`, inventory, and the garden layout.
- **Correct unlocks**
  - At `swallowedCount >= 1`, “Abyssal Rock” is unlocked.
  - At `swallowedCount >= 5`, “Neon Sandcastle” is unlocked.
  - At `swallowedCount >= 10`, “Crystalline Spire” is unlocked.
  - At `swallowedCount >= 20`, “Siren’s Tail” is unlocked.
  - At `swallowedCount >= 50`, “The Lost Bounty” is unlocked.
- **Monotonic behavior**
  - Once an item is unlocked, it stays unlocked across refreshes and future interactions.
- **Purchasing + multiples**
  - A user with `swallowedCount >= 10` can choose to spend currency on any combination of unlocked items (e.g., buy 5 rocks and 1 sandcastle instead of buying the spire), subject to currency balance.
  - Attempting to purchase without sufficient `abyssalCurrency` is blocked and does not change state.
- **Placement**
  - The user can drag/drop owned items onto the seabed canvas.
  - Placed items persist across refreshes and can be moved.
  - Removing a placed item returns it to inventory in MVP.
- **Non-cartoon art direction**
  - Visuals read as “bioluminescent light-and-glass sculptures” within the Neon/Deep Sea aesthetic (no cartoon iconography).
- **Unlock feedback**
  - When a threshold is reached, the user gets a clear, noticeable unlock message including the item name.

## Edge Cases
- **Invalid storage**
  - `swallowedCount` / `abyssalCurrency` missing, empty, non-numeric, NaN, negative, or extremely large → safely handled (defaults/clamps).
  - `abyssalInventory` / `abyssalGardenLayout` missing or invalid JSON → safely handled (empty).
- **Multiple unlocks at once**
  - If a single action increases count across multiple thresholds (e.g., migration/import), the app should unlock all newly eligible items and present either:
    - a stacked/queued notification sequence, or
    - a single summary modal listing all new unlocks.
- **Multi-tab**
  - If the user completes tasks in multiple tabs, `swallowedCount` remains consistent (preferably via `storage` event syncing, but MVP can accept eventual consistency on refresh).
- **Undo completion**
  - If the app supports undo/uncomplete, it does not decrement `swallowedCount` in MVP (documented behavior).
- **Inventory/layout mismatch**
  - If inventory shows negative quantity (corrupt data), clamp to 0.
  - If layout references an itemId that no longer exists, discard that placed entry.
  - If the user removes an item from the canvas, it returns to inventory (no currency refund in MVP).

## Non-Functional Requirements (Optional)
- **Performance**
  - Updating `swallowedCount` and unlock checks must be O(1) per completion and not introduce visible UI lag.
- **Reliability**
  - Logic must not throw if `localStorage` is unavailable (e.g., privacy mode). In that case, operate in-memory for the session and warn silently or degrade gracefully.
- **UX / Visual quality**
  - Rewards should look premium and cohesive with the Neon/Deep Sea aesthetic:
    - luminous gradients, refractive highlights, glass-like caustics
    - restrained silhouettes, sculptural forms
    - avoid flat, saturated “sticker” colors and cartoon outlines


