# Feature Requirement Document (FRED): Deep Sea Login “Airlock”

## Feature Name
Deep Sea Login “Airlock” (Decompression Chamber Experience)

## Goal
Transform the login page into a **native Grimpo universe** entry ritual: not “a form,” but an **airlock** that calmly transitions the user from the surface world into deep work. The page should feel cinematic and tactile while remaining fast, accessible, and resilient on mobile.

## User Story
As a user entering Grimpo, I want the login experience to feel like I’m stepping into a decompression chamber before a deep-sea dive, so that I mentally transition into focused work and feel immersed in the Grimpo world.

## Functional Requirements

### 1. Route + Page Layout
- The feature must be implemented on `app/login/page.tsx`.
- The page must render a **full-screen deep-sea backdrop** behind a **centered glassmorphism card**.
- The card styling must match:
  - `backdrop-blur-xl bg-slate-900/40 border border-cyan-500/30`
  - Rounded corners and subtle glow acceptable as long as it remains legible.
- The layout must remain centered and readable across viewport sizes from 320px wide to desktop ultrawide.

### 2. DeepSea Background (Sonar / Flashlight)
- A background component must exist at `app/components/auth/DeepSeaBackground.tsx` (or equivalent under `app/components/auth/`) using the provided implementation.
- Background must be **pitch black** by default.
- **Sonar flashlight behavior**:
  - On pointer devices (mouse/trackpad), cursor movement reveals the background via a radial mask.
  - The reveal must expose a faint outline of a **Giant Neon Octopus** drifting behind the card.
  - The sonar effect must not block clicks or form interaction (background layer must be `pointer-events: none`).
- **Touch devices**:
  - The sonar/cursor-tracking behavior must be disabled on coarse pointers (e.g. `pointer: coarse`) and/or when no hover is available.
  - The background should degrade gracefully to a static gradient + subtle marine snow.

### 3. Login Card Copy + Visual Tone
- Header text must be: **“Access The Abyss”**
- Typography requirements:
  - Thin/clean, slightly spaced-out tracking.
  - High contrast for readability.
- The page should avoid “app form” vibes; UI must feel like **equipment controls** in a decompression chamber.

### 4. Form Fields (Email + Password)
- Inputs required:
  - Email
  - Password
- Input styling requirements:
  - Transparent background or near-transparent surface
  - Bottom border style: `border-b border-cyan-500/50`
  - On focus: border glow intensifies (stronger cyan) and/or focus ring.
- Validation requirements:
  - Email must be `type="email"` and required.
  - Password must be required.
- Error handling requirements:
  - Auth errors must appear within the card and be readable (no tiny toast-only errors).
  - Errors should not leak sensitive information (keep messages generic where possible).

### 5. The “Ink Cloud” Password Mask (Show/Hide)
Instead of a standard “eye” icon:
- When password is hidden:
  - The password text must appear **obscured by ink** (e.g., `blur-sm` on the text and/or a layered smoky overlay).
  - The field should visually read as “inked” rather than “masked by dots.”
- When toggling “Show Password”:
  - A squid swims past the field and “clears” the ink, revealing the password.
  - When toggling back to hidden, the squid squirts ink back over the field.
- Animation constraints:
  - Must be performant (CSS transforms/opacity preferred).
  - Must respect `prefers-reduced-motion` by disabling or simplifying the animation.

### 6. Primary Action: “Submerge” Transition (Dive Lever / Hatch)
- The primary call-to-action must be labeled: **“DIVE”**
- The CTA must not feel like a standard rectangular button; it should feel like:
  - A dive lever, or
  - A heavy circular hatch (acceptable if still accessible and clickable).
- Click behavior:
  - CTA scales down slightly on press.
  - Trigger a **full-screen fade-to-black** transition (and optional bubble rise animation).
  - After transition begins, redirect to the post-login destination.
- Sound behavior (optional, gated):
  - A short “pressurized seal opening” sound may play if allowed.
  - Must not auto-play on page load.
  - Must be muted/disabled automatically when `prefers-reduced-motion` or `prefers-reduced-transparency` and/or user has disabled sound (if such setting exists later).

### 7. Auth Integration (Better-Auth Client)
- Sign-in must use the existing Better-Auth client:
  - `authClient.signIn.email({ email, password })`
- If the page supports sign-up on the same screen, it must use:
  - `authClient.signUp.email({ email, password, name })`
- Loading state requirements:
  - Disable inputs and CTA during in-flight requests.
  - Provide visible feedback (e.g., “…” or “Submerging…”).
- On success:
  - Redirect to the agreed post-login route and refresh router state.
  - The redirect must occur after (or during) the Submerge transition (fade-to-black).

### 8. Post-Login Destination (Decision Required)
Current implementation redirects to `/` on success.
- The feature must define **one** canonical destination:
  - Option A: redirect to `/` (existing workspace/home)
  - Option B: redirect to `/dashboard` (requires an actual route)
- The chosen destination must be documented and used consistently for sign-in and sign-up.

## Data Requirements
- No new database tables required.
- No new persisted user data required.
- Optional (later): local preference for “reduced effects” or “mute sounds” could be stored, but is out of scope for MVP.

## User Flow

### Sign-In
1. User navigates to `/login`.
2. User sees the black ocean background with sonar reveal (or static fallback on touch).
3. User enters email and password inside the glass card.
4. User optionally toggles “Show Password,” triggering ink-clearing animation.
5. User presses **DIVE** (hatch/lever).
6. UI begins Submerge transition (fade to black + bubbles optional).
7. Client submits `authClient.signIn.email`.
8. On success, app navigates to the post-login destination and refreshes.
9. On failure, transition ends (or reverses) and error is shown inside the card.

### Sign-Up (if included on same page)
1. User switches to sign-up mode (or uses secondary button).
2. User enters email + password.
3. User presses **DIVE** (or separate “Create Account” control if required).
4. Client submits `authClient.signUp.email`.
5. On success, user is redirected to the post-login destination.

## Acceptance Criteria
- ✅ `/login` renders a full-screen deep-sea background behind a centered glassmorphism card.
- ✅ Header reads **“Access The Abyss”** and is legible on all supported screens.
- ✅ Email + password inputs use bottom-border cyan styling, and focus state increases glow.
- ✅ Password show/hide uses the **Ink Cloud** presentation (not an eye icon), including an animation (with reduced-motion fallback).
- ✅ On pointer devices, the **Sonar** flashlight reveal follows the cursor and reveals a faint drifting giant neon octopus.
- ✅ On touch devices, sonar tracking is disabled and the page remains usable and visually consistent.
- ✅ Pressing **DIVE** triggers a Submerge transition (button press + full-screen fade) and navigates on successful auth.
- ✅ Sign-in calls `authClient.signIn.email` and handles error states without crashes.
- ✅ Loading states prevent double-submits and clearly communicate progress.
- ✅ Respects `prefers-reduced-motion` (animations simplify/disable) and maintains accessibility.

## Edge Cases
- **Auth failure during transition**: fade must stop/recover and show an error; user must be able to retry without refresh.
- **Slow network**: keep user informed during “submerging” and avoid “stuck black screen” without messaging.
- **Rapid repeated clicks**: double submits must be prevented.
- **Keyboard-only navigation**: all controls reachable; focus visible; DIVE works via Enter/Space.
- **Reduced motion**: ink squid, bubbles, drift animations must be disabled or simplified.
- **Small screens**: card fits without clipping; scrolling permitted if needed.
- **No pointer / coarse pointer**: sonar must not rely on mouse events; page should not look “broken.”

## Non-Functional Requirements

### Performance
- Background effects must not cause jank; avoid JS animation loops where CSS suffices.
- Avoid re-render storms from mousemove; throttle or use CSS variables/requestAnimationFrame if needed.

### Accessibility
- Must meet basic WCAG expectations for contrast and focus.
- Must respect `prefers-reduced-motion`.
- Provide semantic labels and proper `type="email"`; errors announced in a sensible way (ARIA if needed).

### Security / Privacy
- Do not expose whether an email exists via overly specific errors.
- Do not log passwords; do not store password in localStorage.

### Compatibility
- Must work in modern Chrome/Firefox/Safari.
- Must work in Next.js App Router and remain SSR-safe (background should be client-only where necessary).

## Implementation Notes

### Suggested File Touches (MVP)
- Add: `app/components/auth/DeepSeaBackground.tsx` (provided code, with mobile + reduced-motion guards)
- Update: `app/login/page.tsx` (use `DeepSeaBackground`, new layout + card)
- Update or replace: `app/components/auth/SignInForm.tsx` (to match “Access The Abyss”, ink toggle, DIVE transition, and consistent redirect)
- Optional: `app/globals.css` for reusable keyframes (bubbles, ink, drift) with reduced-motion handling.

### Open Questions
1. What is the canonical post-login destination: `/` (current) or `/dashboard` (new route)?
2. Should sign-up exist on the same screen, or be a mode toggle within the airlock card?
3. Are audio assets allowed in-repo (e.g., under `public/`), and should sound be enabled by default?


