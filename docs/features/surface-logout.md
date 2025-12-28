# Feature Requirement Document: Surface (Logout) Feature

## Feature Name: Surface (Logout) Feature

## Goal:
Provide a thematic and immersive way for users to log out of the application. In line with the "Deep Sea" / "Abyssal" aesthetic of the project, logging out is framed as "Surfacing" or "Decompression", moving from the dark depths of the workspace back to the light of the surface (login screen).

For the Grimpo app, we don't just "Log Out." We "Surface."
The act of leaving the app should feel like ascending from the deep ocean back to the real world. We will create a "Surface Button" that triggers a decompression animation (bubbles rising) before redirecting the user.

## The Concept: "Emergency Surface"
*   **The Metaphor:** Submarines have a "Blow the Ballast" maneuver to rise quickly. 
*   **The Visual:** An icon pointing UP (`ArrowUpCircle`) in the bottom-left corner.
*   **The Transition:** When clicked, the screen fills with bubbles (CSS), the dark "Abyss" background fades to white (sunlight), and then you are redirected to the Login page.

## User Story:
As a logged-in user, I want to be able to log out of the application with a smooth, thematic transition that confirms my action and returns me to the login screen safely.

## Functional Requirements:
1.  **Logout Component (`SurfaceButton`):**
    *   Icon: `ArrowUpCircle` from Lucide React.
    *   Label: "SURFACE" (all caps).
    *   Interaction: Label is hidden by default; it slides out on hover.
    *   Styling: Minimalist, slate-grey text/icon that glows Cyan (`#22d3ee`) on hover.
2.  **The "Decompression" Animation:**
    *   Triggered immediately upon clicking the "SURFACE" button.
    *   **Overlay:** A full-screen fixed overlay appears.
    *   **Bubbles:** Generate 20-30 CSS-based bubbles rising rapidly from the bottom of the screen to the top.
    *   **Background Fade:** The screen background fades from "Abyss Black" (`#000000` or dark slate) to "Surface White" (or a very light cyan/white) over a duration of 1.5 seconds.
3.  **Logout Logic:**
    *   Wait for the 1.5-second animation to complete before executing the logout.
    *   Use `authClient.signOut()` from the `better-auth` integration (`app/lib/auth-client.ts`).
    *   On successful logout, redirect the user to `/login`.
4.  **Placement:**
    *   The button must be placed in the bottom-left corner of the main application layout or sidebar.
    *   It should be consistently available across all authenticated views.

## Data Requirements:
*   Integrates with `app/lib/auth-client.ts` for session termination.

## User Flow:
1.  User identifies the `ArrowUpCircle` icon in the bottom-left of the screen.
2.  User hovers over the icon; the word "SURFACE" slides out and glows Cyan.
3.  User clicks the button.
4.  The button is disabled to prevent multiple clicks.
5.  A "Decompression" overlay covers the screen:
    *   Rapid bubbles rise.
    *   The background fades to light.
6.  After exactly 1500ms, the application calls `authClient.signOut()`.
7.  The user is redirected to the `/login` page.

## Acceptance Criteria:
- [ ] `SurfaceButton` component is created and styled according to requirements.
- [ ] Hover effect (slide-out label and cyan glow) works as intended.
- [ ] Clicking the button triggers the full-screen decompression animation.
- [ ] Bubbles (20-30) rise rapidly across the viewport.
- [ ] Background color transitions from dark to light over 1.5s.
- [ ] `authClient.signOut()` is called ONLY after the 1500ms delay.
- [ ] User is redirected to `/login` upon completion.
- [ ] Button is placed correctly in the bottom-left corner of the layout.

## Edge Cases:
*   **Rapid Clicks:** The button must be disabled immediately after the first click to prevent multiple logout calls or animation restarts.
*   **Reduced Motion:** If `prefers-reduced-motion` is active, the animation should be skipped or significantly simplified (immediate fade or no bubbles), calling logout sooner.
*   **Navigation during animation:** If the user somehow navigates away before the timeout, the logout should still trigger or be cancelled gracefully (though the overlay should prevent navigation).

## Non-Functional Requirements:
*   **Performance:** Animation must maintain 60fps.
*   **Thematic Consistency:** Colors and timing must match the existing "Abyssal" theme.
*   **Accessibility:** Provide `aria-label="Logout"` for the button.

