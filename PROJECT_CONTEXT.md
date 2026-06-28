# Fun with Math - Project Context

## Product Vision

Fun with Math is a playful arithmetic practice experience for young children. The product helps kids build confidence with basic math through short, cheerful sessions where the main reward language is collecting candies.

The long-term vision is to become a gentle daily math habit for kids and families: a place where children can practice addition, subtraction, multiplication, and division without pressure, comparison, or fear of getting answers wrong.

## Product Philosophy

Fun with Math should feel emotionally safe first, educational second, and measurable third.

Core beliefs:
- Kids should feel encouraged even when they get answers wrong.
- Progress should be visible, but never used to shame or pressure.
- Candies are the primary reward language, not scores.
- The app should invite repeat play through warmth and curiosity.
- The experience should avoid leaderboards, rankings, harsh streaks, and performance pressure.
- A child should leave the app feeling, "I can try again."

## Hooked Framework Principles

The product uses a gentle version of the Hooked framework, adapted for children and learning.

### Trigger
- Home screen prompt: "Can you earn more candies today?"
- Recent candy progress creates a soft reminder of the last session.
- The trigger is intentionally low-pressure.

### Action
- The main action is simple: tap "Play Now."
- Setup choices are lightweight and forgiving.
- If operations or digit levels are not selected, the app can mix options automatically.

### Variable Reward
- Each correct answer earns a candy.
- End-screen messages vary by outcome.
- Progress screen shows recent sessions and lifetime candies.
- Rewards are framed as playful collection, not scoring.

### Investment
- Completed sessions are saved locally.
- Returning users see their last-session candy count.
- Progress accumulates subtly over time.

Important adaptation: the app should never use manipulative pressure. The habit loop should be gentle, motivating, and age-appropriate.

## Target Users

Primary users:
- Kids ages 3-9 practicing early arithmetic.

Secondary users:
- Parents who want a simple practice tool.
- Caregivers or teachers looking for a low-friction math activity.

Age considerations:
- Ages 3-5: simple addition/subtraction, large numbers, minimal reading burden.
- Ages 6-7: broader arithmetic practice with 1-2 digit numbers.
- Ages 8-9: multiplication, division, and larger digit levels.

## UX Principles

- Bright, playful, soft colors.
- Large readable numbers.
- Rounded cards and large tap targets.
- Mobile-friendly layouts.
- Kid-friendly wording.
- No harsh "wrong" language.
- No prominent use of the word "score."
- Use "candies collected" or "candies earned."
- Keep setup and home screens uncluttered.
- Keep progress visible but secondary.
- Make failure states kind and motivating.
- Avoid overwhelming repeated emoji visuals.
- Use simple celebratory graphics instead of noisy reward clutter.
- Every screen should have an obvious next step.

## Completed Versions and Features

### MVP

Initial single-file web app:
- Plain HTML, CSS, and JavaScript.
- No backend.
- No login.
- Setup screen with:
  - Duration selector: 1-5 minutes.
  - Operation selector: addition, subtraction, multiplication, division.
  - Digit selector: 1 digit, 2 digits, 3 digits.
- Game screen with:
  - Countdown timer.
  - Candies collected.
  - One question at a time.
  - Answer input and submit button.
- End screen with candies collected.
- Question generation rules:
  - Subtraction avoids negative answers.
  - Division uses whole-number answers.
  - Multiplication is kept reasonable for kids.
  - Exact same questions are avoided within a session.

### V1.1

Gameplay and result improvements:
- Added question counter during gameplay.
- Added questions solved to result screen.
- Added correct answer count to result screen.
- Added Enter key support through form submission.
- Added input auto-focus.
- Added back/home control from game screen.
- Added simple countdown clock animation.
- Improved end messages:
  - Zero candies: gentle "try again" messaging.
  - Low candies: positive encouragement to try again and collect more.
  - Higher candies: celebratory messages.
- Replaced overwhelming repeated candy emoji row with a single candy graphic.

### V1.2

Local progress and habit loop:
- Added new Home screen before setup.
- Home screen includes:
  - App title.
  - "Play Now" primary button.
  - "View Progress" secondary action.
  - Subtle motivational message:
    - No previous data: "Collect candies while practicing math!"
    - Previous data: "Last time you earned X candies 🍬. Can you earn more today?"
- Added Progress screen with:
  - Lifetime candies.
  - Last session candies.
  - Last 5 sessions.
- Recent sessions show:
  - Date/time.
  - Candies earned.
  - Questions attempted.
  - Duration selected.
  - Operations selected.
  - Digit levels selected.
- Removed correct answers from recent session cards to keep progress less score-like.
- Added Reset progress button with neutral confirmation.
- Added localStorage session persistence.
- Added in-memory fallback so just-completed sessions populate progress immediately even if file-based localStorage behaves inconsistently.
- Fixed timer-end behavior so the game reliably moves to the result page.
- Added short grace handling for final Enter/Submit at 0:00.

### V2.1

React/Firebase login foundation:
- Added V2 React app shell in `v2-app`.
- Added Firebase Auth Google sign-in.
- Added sign-out.
- Added auth-state tracking with `onAuthStateChanged`.
- Shows signed-in user's display name and email.
- Keeps the app login-only; the math game has not been rebuilt in V2 yet.

### V2.2

Firebase user profile persistence:
- After Google login, the app saves a user profile to Firestore at `users/{uid}`.
- User profile fields:
  - `uid`
  - `displayName`
  - `email`
  - `photoURL`
  - `createdAt`
  - `lastLoginAt`
- Existing user documents keep their original `createdAt`.
- Returning users update `lastLoginAt` on each Google sign-in.
- The app remains login-only; gameplay and progress screens are still deferred.

### V2.3

Firestore security and setup documentation:
- Added repo-tracked Firestore rules in `firestore.rules`.
- Added `firebase.json` so Firebase tooling knows which rules file to deploy.
- Added `FIREBASE_SETUP.md` with the current Firebase project ID, rules behavior, and local test flow.
- Rules allow a signed-in user to read, create, and update only their own `users/{uid}` profile document.
- Rules validate the V2.2 profile shape:
  - `uid`
  - `displayName`
  - `email`
  - `photoURL`
  - `createdAt`
  - `lastLoginAt`
- Rules preserve `createdAt`, refresh `lastLoginAt`, and deny client deletes.
- The app remains login-only; gameplay and progress screens are still deferred.

### V3

Authenticated React gameplay and progress:
- Rebuilt the V1.2 math practice experience inside the React app.
- Kept Firebase Google sign-in and sign-out.
- Added signed-in Home screen with:
  - App title.
  - "Play Now" primary action.
  - "View Progress" secondary action.
  - Gentle last-session candy prompt when progress exists.
- Rebuilt setup flow in React:
  - Duration selector: 1-5 minutes.
  - Operation selector: addition, subtraction, multiplication, division.
  - Digit selector: 1 digit, 2 digits, 3 digits.
  - Empty operation selection mixes all operations.
  - Empty digit selection mixes all digit levels.
- Rebuilt game flow in React:
  - Countdown timer.
  - Candies collected.
  - Question counter.
  - One question at a time.
  - Answer input with submit and Enter key support.
  - Input auto-focus.
  - Home control from game screen.
  - Timer-end result transition.
  - Short grace handling for final submit at 0:00.
- Rebuilt result flow in React:
  - Candies collected.
  - Questions attempted.
  - Correct answer count available on result, but candies remain the main reward.
  - Encouraging end messages based on candies earned.
  - Post-game result uses a compact 5-star surprise animation based on correct-answer percentage.
  - Result layout keeps visual focus on candies collected.
- Rebuilt progress flow in React:
  - Lifetime candies.
  - Last session candies.
  - Last 5 sessions.
  - Recent sessions use a Candy Timeline layout instead of a table.
  - The main progress page shows the latest 5 sessions.
  - Older sessions live on a separate "All Candy Rounds" screen.
  - Timeline cards are intentionally compact so the latest 5 sessions can fit without much scrolling.
  - Timeline cards show candies earned, date, duration, questions attempted, compact operation summary, and compact digit summary.
  - Full mixed-operation rounds show "All operations"; partial operation rounds use math symbols.
- Saves completed sessions to Firestore at `users/{uid}/sessions/{sessionId}`.
- Reads recent sessions and lifetime candies from Firestore for signed-in users.
- Updated Firestore rules for the new session collection path.

## Current Architecture

### V1 Architecture

V1 is a single-file web app:
- `index.html`
  - HTML screens.
  - CSS styling.
  - JavaScript state and game logic.

Main screens:
- Home screen.
- Progress screen.
- Setup screen.
- Game screen.
- End/result screen.

Core JavaScript state:
- `appState.setup`
  - `durationMinutes`
  - `operations`
  - `digitLevels`
- `appState.session`
  - `candies`
  - `questionsAttempted`
  - `correctAnswers`
  - `secondsLeft`
  - `totalSeconds`
  - `timerId`
  - `endGraceTimerId`
  - `currentQuestion`
  - `askedQuestionKeys`
  - `ended`
  - `saved`
  - `history`
- `appState.lastCompletedSession`

Local persistence:
- Uses `localStorage`.
- Storage key: `funWithMathSessionsV12`.
- Sessions are stored as JSON using `JSON.stringify` and read with `JSON.parse`.
- Recent in-memory sessions are merged with saved sessions for immediate progress rendering.

Important helpers:
- `loadSessions()`
- `saveSession()`
- `getLifetimeCandies()`
- `renderHome()`
- `renderProgress()`
- `createSessionRecord()`
- `getEndMessage()`

### V2 Architecture

V2 is a React project:
- Project folder: `v2-app`.
- Firebase is already installed.
- `src/firebase.js` exports:
  - `auth`
  - `googleProvider`
  - `db`
- `src/App.jsx` currently handles:
  - Google sign-in with `signInWithPopup`
  - Sign-out with `signOut`
  - Auth-state listening with `onAuthStateChanged`
  - Firestore profile save to `users/{uid}` after Google login
- Root Firebase setup files:
  - `firebase.json`
  - `firestore.rules`
  - `FIREBASE_SETUP.md`

V3 moves the product beyond local-only state into authenticated React gameplay and Firestore-backed progress.

## Tech Stack

### V1
- HTML.
- CSS.
- JavaScript.
- localStorage.
- No backend.
- No external libraries.

### V2+
- React.
- Vite.
- Firebase Auth.
- Firebase Firestore.
- CSS.

## Current Product State

Current app:
- V4 React/Firebase app in `v2-app`.
- Production URL: `https://fun-with-math-rouge.vercel.app/`.
- Main branch: `main`.
- Main reward language: candies.
- Current focus: a solid mobile-friendly MVP with authenticated progress, practice recommendations, and kind state handling.

Current user profile path:
- `users/{uid}`

Current session path:
- `users/{uid}/sessions/{sessionId}`

Current session document shape:
- `id`
- `uid`
- `createdAt`
- `candies`
- `questionsAttempted`
- `correctAnswers`
- `durationMinutes`
- `operations`
- `digitLevels`
- `operationStats`
- `digitStats`

Current V4 capabilities:
- Google sign-in and sign-out.
- Firestore user profile persistence.
- Firestore session persistence.
- Signed-in Home, Pick Your Round, Gameplay, Result, Candy Progress, and All Candy Rounds screens.
- Lifetime candies and last-session candies loaded from Firestore.
- Recent Candy Rounds timeline with latest 5 sessions.
- Older sessions available in All Candy Rounds.
- Operation-level and digit-level stats saved per session.
- Expandable recent-session details with correct/attempted counts.
- Setup recommendation accordion based on the lowest-performing operation(s) and digit size(s) from the latest 5 sessions.
- Friendly loading, empty, offline, and save-state messages.
- Submit-based gameplay flow with visual answer feedback.
- Handheld on-screen keypad for mobile/tablet play.
- Confetti on strong post-game results.
- Responsive no-scroll layout polish for small screens.

Current out of scope:
- Parent dashboard.
- Multiple child profiles.
- Classroom mode.
- Operation-level analytics dashboards for adults.
- Migration of existing V1 localStorage data.
- Offline sync beyond graceful UI messaging.

## Future Roadmap

### V5 - Pending: Parent Trust and Adult Visibility

Goals:
- Add trust-building context for parents.
- Give adults useful visibility without making the child experience pressured.
- Keep the child-facing experience candy-first, playful, and emotionally safe.

Potential features:
- Short parent-facing explanation of how progress is saved.
- Clear privacy/safety copy.
- Parent-friendly progress summary.
- Weekly candy summary.
- Optional practice guidance for adults.
- Parent dashboard.
- Multiple child profiles.
- Optional classroom mode.

Important constraint:
- Adult-facing analytics should not leak pressure into the child-facing experience.

## Important Implementation Details

### Question Generation

- Addition uses selected digit levels for both numbers.
- Subtraction sorts operands so answers are never negative.
- Multiplication keeps one factor smaller for larger digit levels to avoid overwhelming kids.
- Division creates clean whole-number answers.
- Exact repeated questions are avoided within a session using a Set of question keys.

### Timer Behavior

- The game uses a countdown timer.
- When time reaches 0, the result screen should always appear.
- A short grace window handles the case where the user presses Enter exactly as the timer reaches 0.
- End-game behavior is idempotent through `appState.session.ended`.
- Sessions are saved only once through `appState.session.saved`.

### Progress Persistence

- Completed sessions are saved when the game ends.
- V1.2 uses localStorage plus an in-memory fallback.
- V4 saves authenticated progress to Firestore at `users/{uid}/sessions/{sessionId}`.
- If Firestore save is delayed or unavailable, the just-completed result can still be shown locally with friendly save-state messaging.

### End Messages

End messages are based on candies earned:
- 0 candies: polite encouragement to try again.
- Fewer than 10 candies: positive feedback plus an invitation to collect more.
- 10 or more candies: celebratory feedback.
- Current result messages should stay short, ideally under 5 words.

This supports emotional safety while still encouraging replay.

### Progress Screen Decisions

The progress screen shows:
- Lifetime candies.
- Last session candies.
- Last 5 sessions.
- Candies earned.
- Questions attempted.
- Duration.
- Operations.
- Digits.
- Expandable operation and digit details by session.

The progress screen keeps correct-answer detail behind expandable session details so the default view stays candy-first and low-pressure.

## Key Product Decisions Made So Far

- Candies are the main reward language.
- Avoid the word "score" in prominent UI.
- Avoid leaderboards and ranking.
- Use gentle self-challenge instead of pressure.
- Home page should be light and uncluttered.
- Progress page can contain more detail, but not harsh performance framing.
- Results should always include encouraging language.
- If no operation is selected, default to all operations.
- If no digit level is selected in later V1.2 behavior, mix digit levels.
- The app should support direct browser opening for V1.
- V2 proved login before rebuilding the game.
- V3 keeps Firebase Auth and adds Firestore-backed session progress.
- V4 adds practice intelligence and mobile MVP polish.
- Firestore rules should evolve with each new data path before launch.

## Repository and Version Folder Notes

Versioning convention:
- Major version folders should live inside the `fun-with-math` repo folder.
- For a minor version like V1.2, update the corresponding major folder:
  - `fun-with-math/v1/index.html`
- MVP remains in:
  - `fun-with-math/mvp/index.html`
- React V2 work lives in:
  - `fun-with-math/v2-app`
- React V2+ work continues in:
  - `fun-with-math/v2-app`

Current recommended structure:

```text
fun-with-math/
  README.md
  mvp/
    index.html
  v1/
    index.html
  v2-app/
    src/
      App.jsx
      App.css
      firebase.js
```

## Current Status

V1.2:
- Available in `fun-with-math/v1/index.html` as the older local-only version.

V4:
- Current production app lives in `v2-app`.
- Deployed at `https://fun-with-math-rouge.vercel.app/`.
- Firebase Auth and Firestore are active.
- Completed sessions save to `users/{uid}/sessions/{sessionId}`.
- Session documents include operation and digit stats.
- Setup recommendations, expandable progress details, mobile gameplay usability, and responsive no-scroll layout polish are implemented.
- V5 is pending and should focus on parent trust polish and adult-facing visibility.
