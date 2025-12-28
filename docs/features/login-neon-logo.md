# Feature Requirement Document (FRED): Login Neon Logo

## Feature Name
Login Neon Logo

## Goal
Add a prominent bioluminescent Dumbo Octopus logo to the login page to establish brand identity and set the "deep sea" atmosphere immediately upon landing. This logo will serve as the primary brand mark for the "Access The Abyss" entry point.

## User Story
As a user, I want to see a beautiful glowing mascot logo when I arrive at the login screen, so that I feel like I am entering a specialized, high-tech deep-sea environment.

## Functional Requirements
1. **Logo Design**: Create a new React component `LoginNeonLogo` that renders a minimalist Dumbo Octopus head with a smile, matching the provided reference image.
2. **Neon Effect**: The logo must feature a multi-layered "neon" bioluminescent glow using cyan/neon colors (`#22d3ee` or similar).
3. **Placement**: The logo should be placed centrally above the "Access The Abyss" heading within the sign-in form container on the `/login` page.
4. **Ambient Animation**: The logo should have a subtle ambient animation, such as a gentle pulse or a slow vertical float, to make it feel "alive" like a bioluminescent creature.
5. **Self-Contained**: The component should be a single file including all necessary SVG markup and styling.

## Data Requirements
None. This is a purely presentational component.

## User Flow
1. User navigates to the login page (`/login`).
2. User sees the cinematic deep-sea background.
3. User sees the glowing neon Dumbo Octopus logo centered above the login form.
4. The logo provides a welcoming and immersive "mascot" presence while the user enters their credentials.

## Acceptance Criteria
- The logo shape matches the provided reference (minimalist head, ear-like fins, and a simple smile).
- The logo exhibits a visible, multi-layered cyan neon glow.
- The logo is centered horizontally above the login form content.
- The logo scales appropriately for mobile and desktop views.
- The animation is subtle and does not distract from the login process.

## Edge Cases
- **Small Viewports**: Ensure the logo and its glow do not overflow the container or push the form below the fold unnecessarily.
- **Reduced Motion**: If the user has `prefers-reduced-motion` enabled, the ambient animation should be disabled or significantly slowed.
- **Browser Compatibility**: The SVG filters and CSS animations should work across modern browsers (Chrome, Firefox, Safari, Edge).

## Non-Functional Requirements
- **Performance**: The SVG and CSS effects should be lightweight to ensure the login page remains fast.
- **Maintainability**: The component should be easy to tweak (color, glow intensity, size) via props.

