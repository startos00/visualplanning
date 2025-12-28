# Feature Requirement Document (FRED): The Abyssal Garden

## Feature Name
The Abyssal Garden

## Goal
Introduce an MVP-friendly, "Neon/Deep Sea" gamification layer where completing tasks earns a **spendable currency** and expands a **shop inventory** of premium-looking, non-cartoon **bioluminescent light-and-glass sculptures**. Users can **purchase multiple items**, then **drag/drop** them onto a seabed canvas to decorate their Abyssal Garden. All progression and the garden layout persist in a database backend, synchronized across sessions and devices.

## User Story
As a user completing planning tasks, I want to unlock beautiful deep-sea decorations that appear in my app, so that I feel rewarded and motivated to keep completing tasks.

## Functional Requirements
- **Progress counter (lifetime unlocks)**
  - The app tracks a single lifetime integer counter named **`swallowedCount`** in the **database** (per user).
  - `swallowedCount` represents the cumulative number of tasks the user has completed (as defined by the app's "task completion" event).
  - `swallowedCount` must never be negative.
  - If the database value is missing or invalid, the app initializes it to `0`.

- **Currency balance (spendable)**
  - The app tracks a spendable integer balance named **`abyssalCurrency`** in the **database** (per user).
  - `abyssalCurrency` is the user's currency used to **purchase** decorations.
  - `abyssalCurrency` must never be negative.
  - If the database value is missing or invalid, the app initializes it to `0`.

- **Earn behavior**
  - When a user completes a task, increment `swallowedCount` by `1`.
  - When a user completes a task, also increment `abyssalCurrency` by `1`.
  - Reverting/uncompleting a task does **not** decrement `swallowedCount` or `abyssalCurrency` in MVP (prevents oscillation/exploit complexity). If the product currently supports “undo complete,” it should not affect lifetime progress or currency.

- **Unlock tiers (availability in shop)**
  - Unlocks are based on the value of `swallowedCount` reaching or exceeding thresholds and determine which items are available to purchase:
    - **1** task: unlock **"Abyssal Rock"** (Base decoration), **"Seaweed"**, **"Bubble"**, **"Small Coral"**, **"Shrimp"**, **"Plankton"**, **"Starfish"**, **"Sea Flowers"**
    - **5** tasks: unlock **"Neon Sandcastle"** (Structure), **"Big Coral"**, **"Dumbo Octopus"**
    - **10** tasks: unlock **"Crystalline Spire"** (The Glass Castle), **"Turtle"**, **"Shellfish"**
    - **15** tasks: unlock **"Michelangelo's David"** (Classical Sculpture), **"Roman Ruin"**
    - **20** tasks: unlock **"Siren's Tail"** (The Mermaid), **"Whales"**
    - **50** tasks: unlock **"The Lost Bounty"** (Treasure Chest)
  - Unlocks are monotonic: once unlocked, always unlocked.

- **Item costs (MVP)**
  - Each decoration has a fixed cost in `abyssalCurrency`:
    - Abyssal Rock: **1**
    - Seaweed: **2**
    - Bubble: **3**
    - Small Coral: **2**
    - Shrimp: **2**
    - Plankton: **3**
    - Starfish: **3**
    - Sea Flowers: **3**
    - Neon Sandcastle: **5**
    - Big Coral: **5**
    - Dumbo Octopus: **5**
    - Crystalline Spire: **10**
    - Turtle: **5**
    - Shellfish: **5**
    - Michelangelo's David: **10**
    - Roman Ruin: **15**
    - Siren's Tail: **20**
    - Whales: **20**
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
  - The app maintains an inventory of owned items and quantities (e.g., "Abyssal Rock × 5").
  - Inventory is persisted in the database (per user).

- **Decorate the seabed canvas (placement)**
  - The Abyssal Garden includes a **seabed canvas** the user can decorate.
  - The user can select an owned item from inventory and **drag/drop** it onto the seabed canvas to place it.
  - Placing an item:
    - decreases that item's inventory quantity by `1`
    - creates a placed instance in the garden layout with a unique id, position data, default size, and default color
  - The user can select a placed item and:
    - **move it** (drag to reposition)
    - **resize it** (using resize handles or pinch gestures on touch devices)
      - Size is constrained to reasonable min/max bounds (e.g., 50% to 200% of default size)
      - Size changes are applied in real-time as the user drags
    - **change its color** (via color picker or preset color palette)
      - Each item can be assigned a custom color that affects its neon glow and bioluminescent effects
      - Color choices should maintain the deep-sea aesthetic (suggested palette: warm golds/ambers, cool cyans/teals, coral/pink/magenta, greens, purples)
      - The color is applied to the item's glow effects while maintaining the item's recognizable form
    - **delete it** (remove from canvas, returns it to inventory in MVP)
  - The garden layout persists across refreshes and is synchronized via the database backend.

- **Presentation / where rewards appear**
  - The app presents an "Abyssal Garden" area/section where unlocked items are visible.
  - Items are shown as **sculptural bioluminescent objects constructed from light and glass**, aligned with the existing "Neon/Deep Sea" aesthetic.
  - Items should not be rendered as cartoonish icons (no flat outlines, chibi proportions, or playful sticker-like styling).
  - The garden is designed to be aesthetically pleasing and promote calm and de-stressing through soothing visual effects and recognizable, realistic forms enhanced with subtle neon accents.

- **Item Visual Descriptions**
  - Each decoration item has a specific visual appearance that balances realistic form recognition with fantastical bioluminescent effects:
    - **Abyssal Rock**: Abstract, minimal sculptural form with subtle ambient glow. Maintains a simple, grounding presence in the garden.
    - **Seaweed**: Flowing, organic form resembling underwater kelp or seaweed fronds. Features a subtle green/cyan neon glow that gently sways. The form should be recognizable as seaweed while maintaining an elegant, sculptural quality.
    - **Bubble**: Spherical form representing an air bubble rising through water. Features a translucent appearance with subtle cyan/white neon rim glow and refractive highlights. The bubble should appear light and ethereal.
    - **Small Coral**: Compact coral formation with branching, organic structure. Features a warm pink/coral neon glow that emanates from the branches. Should be recognizable as coral while maintaining bioluminescent qualities.
    - **Shrimp**: Small crustacean silhouette with recognizable shrimp form (curved body, antennae, legs). Features a subtle pink/orange neon glow. Should be recognizable as a shrimp while maintaining the deep-sea aesthetic.
    - **Plankton**: Tiny, organic forms representing microscopic marine organisms. Features a subtle blue/cyan neon glow that creates a gentle, twinkling effect. Multiple plankton particles can be grouped together to create a bioluminescent cloud effect. Should appear delicate and ethereal.
    - **Starfish**: Five-armed starfish form with recognizable radial symmetry. Features a subtle pink/orange/amber neon glow that emanates from the center and along each arm. The form should be clearly recognizable as a starfish while maintaining the bioluminescent aesthetic.
    - **Sea Flowers**: Delicate underwater flower forms with multiple petals and organic stems. Features a subtle pink/purple/cyan neon glow that emanates from the flower centers and along the petals. The form should be recognizable as underwater flowers while maintaining an elegant, bioluminescent quality. Multiple sea flowers can create a garden-like effect.
    - **Neon Sandcastle**: Realistic sandcastle form with recognizable features including turrets, crenellations, and architectural details. Features a warm golden/amber neon glow that emanates softly from the structure, creating an ambient, inviting light. The glow should be subtle and calming, not harsh or overwhelming.
    - **Big Coral**: Large coral formation with extensive branching structure and multiple growth points. Features a warm pink/coral neon glow that highlights the coral's complex structure. Should be more substantial than small coral while maintaining the same aesthetic principles.
    - **Dumbo Octopus**: Octopus form with distinctive ear-like fins (characteristic of the dumbo octopus species). Features a subtle purple/pink/cyan neon glow that pulses gently, with the fins creating an elegant, flowing silhouette. The form should be recognizable as a dumbo octopus while maintaining the bioluminescent, deep-sea aesthetic.
    - **Crystalline Spire**: Glass-like tower structure resembling a crystalline formation with vertical facets and refractive surfaces. Features cool cyan/teal neon accents that highlight the crystalline edges and create gentle caustic light patterns. The spire should be recognizable as a tower/spire structure while maintaining its fantastical glass-like quality.
    - **Turtle**: Sea turtle silhouette with recognizable shell, flippers, and head. Features a subtle green/cyan neon glow that highlights the turtle's form. Should be recognizable as a turtle while maintaining the bioluminescent aesthetic.
    - **Shellfish**: Shell/mollusk form with recognizable shell structure (spiral or bivalve). Features a subtle pink/pearl neon glow with iridescent highlights. Should be recognizable as a shellfish while maintaining the deep-sea aesthetic.
    - **Michelangelo's David**: Classical sculpture form representing the iconic statue. Features a warm white/amber neon glow that highlights the sculptural details. Should be recognizable as the David statue while maintaining the bioluminescent, deep-sea aesthetic (creating an interesting contrast between classical art and deep-sea bioluminescence).
    - **Roman Ruin**: Ancient Roman architectural ruin form with recognizable classical elements (columns, arches, weathered stone). Features a warm amber/white neon glow that highlights the architectural details and creates a sense of ancient grandeur. The ruin should be recognizable as Roman architecture while maintaining the bioluminescent, deep-sea aesthetic (creating an interesting contrast between ancient civilization and deep-sea bioluminescence).
    - **Siren's Tail**: Mermaid tail silhouette with a flowing, organic form that suggests scales and fins. Features coral/pink/magenta neon glow that pulses subtly along the tail's length, with scale patterns suggested through light variations rather than explicit detail. The form should be clearly recognizable as a mermaid tail while maintaining an elegant, sculptural quality.
    - **Whales**: Large whale silhouette with recognizable whale form (streamlined body, tail fluke, possibly visible blowhole). Features a subtle blue/cyan neon glow that creates a majestic, calming presence. The whale should be substantial in size and recognizable as a whale while maintaining the bioluminescent aesthetic. Multiple whales can create a pod effect.
    - **The Lost Bounty**: Treasure chest form with ornate details including decorative bands, a lock mechanism, and structural elements typical of a treasure chest. Features a warm gold/amber neon glow that suggests treasure glowing within, with soft ambient light emanating from seams and decorative elements. The chest should be immediately recognizable as a treasure chest while maintaining its bioluminescent, deep-sea aesthetic.
  - **Custom Colors**: All items support custom color assignment. When a color is assigned:
    - The item's neon glow effects adapt to the chosen color while maintaining appropriate saturation and brightness for the deep-sea aesthetic
    - The item's form and structure remain recognizable regardless of color
    - Color choices should be validated to ensure they maintain visual harmony with the garden's calming aesthetic

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
- **Storage**: Database (PostgreSQL via Drizzle ORM)
  - Table: `abyssal_garden_states`
  - Fields:
    - `id`: text (primary key, "main" for single garden per user)
    - `user_id`: text (foreign key to user)
    - `swallowed_count`: integer (default: 0)
      - Validation: clamp to min 0, invalid → treat as 0
    - `abyssal_currency`: integer (default: 0)
      - Validation: clamp to min 0, invalid → treat as 0
    - `inventory`: JSONB object map of itemId → quantity (e.g., `{"abyssal-rock": 5, "neon-sandcastle": 1}`)
      - Validation: invalid/missing → treat as empty inventory, quantities clamp to min 0
    - `garden_layout`: JSONB array of placed items, each with:
      - `id` (unique string)
      - `itemId` (e.g., `"abyssal-rock"`)
      - `x`, `y` (canvas coordinates, numbers)
      - `scale` (number, default: 1.0, represents size multiplier, e.g., 0.5 = 50% size, 2.0 = 200% size)
        - Validation: clamp to reasonable bounds (e.g., 0.5 to 2.0), invalid → default to 1.0
      - `color` (string, optional, hex color code or color name, e.g., `"#ffc107"` or `"amber"`)
        - Validation: validate hex format or known color names, invalid → use item's default color
      - optional: `zIndex` / `layer` (number) for render order
      - Validation: invalid/missing → treat as empty layout, discard entries with unknown itemId or invalid coordinates
    - `awarded_tasks`: JSONB object (tracks which tasks have already been awarded to prevent duplicate rewards)
    - `created_at`: timestamp
    - `updated_at`: timestamp
  - **Client-side caching**: State is cached in memory for synchronous access, with async updates to the database
  - **Multi-tab synchronization**: State changes trigger events that sync across tabs via the database

## User Flow
1. User completes a task in the planner.
2. App increments `swallowedCount` and `abyssalCurrency` in the database (via API call).
3. App checks unlock thresholds against the new `swallowedCount`.
4. If a threshold has just been reached (new shop item becomes available):
   - show an unlock notification/celebration toast
5. User navigates (or is guided) to the Abyssal Garden section.
6. App loads garden state from database (cached client-side for performance).
7. User opens the shop, sees available items and costs, and purchases one or more items (currency decreases in database; inventory increases).
8. User selects an owned item from inventory and drags it onto the seabed canvas to place it (inventory decreases; layout updates in database with default size and color).
9. User interacts with placed items:
   - **Reposition**: Drag a placed item to move it to a new location (updates persisted to database).
   - **Resize**: Select a placed item and use resize handles to adjust its size (updates persisted to database in real-time).
   - **Change Color**: Select a placed item and open color picker/palette to assign a custom color (updates persisted to database).
   - **Delete**: Click delete button on a selected item to remove it from canvas (returns to inventory in MVP, updates persisted to database).

## Acceptance Criteria
- **Counter persistence**
  - After completing N tasks, refreshing the page preserves `swallowedCount`, `abyssalCurrency`, inventory, and the garden layout via database persistence.
  - State persists across devices for the same user account.
- **Correct unlocks**
  - At `swallowedCount >= 1`, "Abyssal Rock", "Seaweed", "Bubble", "Small Coral", "Shrimp", "Plankton", "Starfish", and "Sea Flowers" are unlocked.
  - At `swallowedCount >= 5`, "Neon Sandcastle", "Big Coral", and "Dumbo Octopus" are unlocked.
  - At `swallowedCount >= 10`, "Crystalline Spire", "Turtle", and "Shellfish" are unlocked.
  - At `swallowedCount >= 15`, "Michelangelo's David" and "Roman Ruin" are unlocked.
  - At `swallowedCount >= 20`, "Siren's Tail" and "Whales" are unlocked.
  - At `swallowedCount >= 50`, "The Lost Bounty" is unlocked.
- **Monotonic behavior**
  - Once an item is unlocked, it stays unlocked across refreshes and future interactions.
- **Purchasing + multiples**
  - A user with `swallowedCount >= 10` can choose to spend currency on any combination of unlocked items (e.g., buy 5 rocks and 1 sandcastle instead of buying the spire), subject to currency balance.
  - Attempting to purchase without sufficient `abyssalCurrency` is blocked and does not change state.
- **Placement**
  - The user can drag/drop owned items onto the seabed canvas.
  - Placed items persist across refreshes and can be moved, resized, and recolored.
  - Removing a placed item returns it to inventory in MVP.
- **Resizing**
  - Users can resize placed items using resize handles or touch gestures.
  - Size changes are constrained to reasonable bounds (e.g., 50% to 200% of default size).
  - Size changes are applied in real-time and persist across refreshes.
- **Color Assignment**
  - Users can assign custom colors to placed items via color picker or preset palette.
  - Colors affect the item's neon glow effects while maintaining the item's recognizable form.
  - Color choices are validated to ensure they maintain visual harmony with the deep-sea aesthetic.
  - Color assignments persist across refreshes.
- **Deletion**
  - Users can delete placed items from the canvas.
  - Deleted items return to inventory (no currency refund in MVP).
  - Deletion is confirmed or can be undone within a short time window (optional enhancement).
- **Non-cartoon art direction**
  - Visuals read as "bioluminescent light-and-glass sculptures" within the Neon/Deep Sea aesthetic (no cartoon iconography).
- **Visual fidelity**
  - Items should be recognizable as their real-world counterparts (sandcastle, spire/tower, mermaid tail, treasure chest) while maintaining the bioluminescent aesthetic. Each item should clearly convey its intended form and purpose through realistic proportions and recognizable features, enhanced with subtle neon colors and ambient glow effects.
- **Unlock feedback**
  - When a threshold is reached, the user gets a clear, noticeable unlock message including the item name.

## Edge Cases
- **Invalid storage**
  - `swallowedCount` / `abyssalCurrency` missing, empty, non-numeric, NaN, negative, or extremely large → safely handled (defaults/clamps).
  - `abyssalInventory` / `abyssalGardenLayout` missing or invalid JSON → safely handled (empty).
  - Database connection failures → gracefully degrade to in-memory state with user notification.
- **Multiple unlocks at once**
  - If a single action increases count across multiple thresholds (e.g., migration/import), the app should unlock all newly eligible items and present either:
    - a stacked/queued notification sequence, or
    - a single summary modal listing all new unlocks.
- **Multi-tab**
  - If the user completes tasks in multiple tabs, `swallowedCount` remains consistent via database synchronization and custom event broadcasting.
  - State changes trigger `abyssal:update` events that refresh UI across tabs.
- **Undo completion**
  - If the app supports undo/uncomplete, it does not decrement `swallowedCount` in MVP (documented behavior).
  - Task IDs are tracked in `awardedTasks` to prevent duplicate rewards for the same task.
- **Inventory/layout mismatch**
  - If inventory shows negative quantity (corrupt data), clamp to 0.
  - If layout references an itemId that no longer exists, discard that placed entry.
  - If the user removes an item from the canvas, it returns to inventory (no currency refund in MVP).
- **Resize constraints**
  - If a placed item's scale is outside valid bounds (e.g., < 0.5 or > 2.0), clamp to nearest valid value.
  - If scale is missing or invalid, default to 1.0.
- **Color validation**
  - If a placed item's color is invalid or unsupported, fall back to the item's default color.
  - Color values should be validated on both client and server to prevent injection or invalid data.
- **Authentication**
  - Garden state is user-specific and requires authentication to access.
  - Unauthenticated users cannot access or modify garden state.

## Non-Functional Requirements (Optional)
- **Performance**
  - Updating `swallowedCount` and unlock checks must be O(1) per completion and not introduce visible UI lag.
  - Resize operations should be debounced or throttled to avoid excessive database updates during continuous dragging.
  - Color changes should update the UI immediately while persisting to database asynchronously.
- **Reliability**
  - Logic must not throw if database is unavailable. In that case, operate in-memory for the session and warn silently or degrade gracefully.
  - API calls should handle network failures gracefully with retry logic or fallback behavior.
  - Client-side state cache provides synchronous access while async updates happen in the background.
- **UX / Visual quality**
  - Rewards should look premium and cohesive with the Neon/Deep Sea aesthetic, designed to promote calm and de-stressing:
    - Subtle, ambient neon glows (not harsh or overwhelming) that create a soothing visual environment
    - Calming color palettes that promote relaxation: warm golds/ambers, cool cyans/teals, coral/pink/magenta
    - Realistic object forms that are recognizable as their real-world counterparts (sandcastle looks like a sandcastle, treasure chest looks like a treasure chest) while maintaining fantastical bioluminescent qualities
    - Luminous gradients, refractive highlights, glass-like caustics that add depth without visual noise
    - Restrained silhouettes, sculptural forms that feel premium and intentional
    - Soothing visual effects that help de-stress and create a peaceful garden environment
    - Avoid flat, saturated "sticker" colors and cartoon outlines
  - **Customization**
    - Resize handles should be clearly visible but not obtrusive when an item is selected
    - Color picker/palette should be easily accessible and provide a curated selection of colors that maintain the deep-sea aesthetic
    - Size and color changes should provide immediate visual feedback
    - All customization options should feel intuitive and discoverable

## Implementation Status

✅ **Implemented** - All core features from the FRED have been implemented:

- ✅ All 19 items defined and added to the system
- ✅ Database schema updated with all items in default inventory
- ✅ Unlock tiers working correctly (1, 5, 10, 15, 20, 50 tasks)
- ✅ Purchase system with currency tracking
- ✅ Drag-and-drop placement on seabed canvas
- ✅ Resize functionality (50% to 200% scale) with visual handles
- ✅ Color customization with curated palette (amber, cyan, teal, pink, magenta, purple, green, gold, coral)
- ✅ Move/reposition functionality for placed items
- ✅ Delete functionality (returns to inventory)
- ✅ Visual styles for all 19 items matching FRED descriptions
- ✅ Unlock notifications/toasts
- ✅ Multi-tab synchronization via events
- ✅ Persistent state across sessions

**Technical Implementation:**
- TypeScript types updated for all 19 items
- CSS animations and styles for bioluminescent effects
- Resize handles with distance-based scaling
- Color picker with preset palette
- Real-time visual feedback for all interactions
- Database persistence for all state changes
