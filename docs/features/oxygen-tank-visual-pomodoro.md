# Feature Requirement Document: Oxygen Tank (Visual Pomodoro)

## Feature Name
Oxygen Tank (Visual Pomodoro)

## Goal
To combat "time blindness", emotional fatigue, and the stress of standard timers by visualizing deep work periods as an "Oxygen Supply" rather than a deadline. This tool helps users manage their energy levels and avoid burnout by framing focus time as a finite resource (oxygen) for a "dive" into deep work.

## User Story
As a deep thinker, I want to see my work time visualized as a depleting oxygen supply so that I can manage my focus periods and avoid "time blindness" without the anxiety triggered by traditional countdown clocks.

## Functional Requirements
- **Dive Setup**: Users can set a "Dive Time" (standard duration e.g., 25, 45, 60 minutes).
- **Visual Gauge**: A small gauge/bar appears on the Dumbo mascot card.
- **Dynamic Visualization**: 
    - The gauge width/fill level reduces linearly from 100% to 0% based on elapsed time.
    - The color transitions from Green (100%-60%) to Yellow (60%-20%) to Red (20%-0%).
- **Completion Signal**: When the gauge reaches 0%, the Dumbo mascot performs a "shake" animation to signal that it is time to "Surface for air!"
- **Controls**: Ability to Start, Pause, and Reset the "Oxygen Tank".
- **Background Persistence**: The timer should continue to track time accurately even if the tab is not in the foreground.

## Data Requirements
- **Session State**: Store the current dive's start time, total duration, and paused time.
- **Persistence**: Initially, this can be stored in local component state or `localStorage` to survive page refreshes.

## User Flow
1. **Initiate**: User interacts with the Dumbo mascot to "Prepare for a Dive."
2. **Configure**: User selects a duration (defaulting to 45 mins).
3. **Descent**: User starts the timer; the "Oxygen Tank" gauge appears and begins depleting.
4. **Deep Work**: User focuses on tasks while the gauge provides a peripheral sense of remaining "air."
5. **Surfacing**: When the gauge hits 0, Dumbo shakes. The user is prompted to "Surface for air" (take a break).
6. **Reset**: User resets the tank for a new dive after a break.

## Acceptance Criteria
- [ ] Gauge component is integrated into the Dumbo mascot UI.
- [ ] Gauge depletion is visually smooth (using CSS transitions or `requestAnimationFrame`).
- [ ] Color transitions occur correctly at specified thresholds (Green/Yellow/Red).
- [ ] Dumbo mascot executes a shake animation precisely when time expires.
- [ ] Start/Pause/Reset controls are functional.
- [ ] Time tracking remains accurate within +/- 1 second over a 60-minute period.

## Edge Cases
- **Tab Inactivity**: Handling `setInterval` throttling in background tabs (consider using `Date.now()` differences).
- **Multiple Tabs**: If the application is open in multiple tabs, timers should ideally stay in sync (out of scope for V1, but a consideration).
- **System Sleep**: Timer should account for time passed while the computer was asleep.

## Non-Functional Requirements
- **Performance**: Minimal CPU usage to ensure the "deep work" environment remains snappy.
- **UI/UX**: Must adhere to the existing "Deep Sea/Abyssal" aesthetic (bioluminescent colors, translucent glass effects).
- **Accessibility**: Provide a subtle audio cue or browser notification when the tank is empty for users not looking at the screen.

