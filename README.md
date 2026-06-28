# Fun with Math

A playful, kid-friendly arithmetic practice app designed to help children build confidence with math through short, cheerful sessions.

The product uses candies as the main reward language instead of scores. The goal is a gentle daily practice habit: encouraging, low-pressure, and safe for kids who are still learning.

## Live App

https://fun-with-math-rouge.vercel.app/

## Product Principles

- Kids should feel encouraged even when answers are wrong.
- Progress should be visible, but never shameful or pressuring.
- Candies are the primary reward language.
- Avoid leaderboards, rankings, harsh streaks, and prominent score framing.
- Keep screens simple, friendly, mobile-ready, and easy to understand.
- Every screen should have an obvious next step.

## Current State

### V1.2

V1.2 is the current complete playable math game. It lives in:

```text
v1/index.html
```

It is a single-file HTML/CSS/JavaScript app with local progress saved on the device.

### V4

V4 is the current React/Firebase app. It lives in:

```text
v2-app/
```

V4 includes:

- React + Vite app.
- Firebase Google sign-in.
- Sign-out.
- Auth-state tracking.
- Firestore user profile persistence at `users/{uid}`.
- Signed-in home screen.
- React setup, gameplay, result, and progress screens.
- Firestore session persistence at `users/{uid}/sessions/{sessionId}`.
- Lifetime candies and recent sessions loaded from Firestore.
- Operation-level and digit-level session stats.
- Setup recommendation accordion based on the lowest-performing operations and digit sizes from recent sessions.
- Expandable recent-session details showing correct/attempted counts by operation and digit size.
- Polished Candy Progress timeline with latest 5 sessions.
- Separate scrollable All Candy Rounds view for older sessions.
- Mobile-friendly gameplay with on-screen keypad for handheld devices.
- Submit-based answer flow with visual feedback for correct/incorrect answers.
- Friendly loading, empty, offline, and save-state messaging.
- Polished post-game result screen with candy-focused rewards and confetti for strong rounds.
- Responsive no-scroll layout polish for mobile result, gameplay, setup, and progress screens.
- Repo-tracked Firestore security rules.
- Firebase setup documentation.

### Next: V5 - Pending

V5 is pending. It should focus on parent trust polish and adult-facing visibility without adding pressure to the child-facing experience.

## Repository Structure

```text
fun-with-math/
  README.md
  PROJECT_CONTEXT.md
  FIREBASE_SETUP.md
  firebase.json
  firestore.rules
  v1/
    index.html
  v2-app/
    src/
      App.jsx
      App.css
      firebase.js
```

## Tech Stack

### V1

- HTML
- CSS
- JavaScript
- localStorage

### V2+

- React
- Vite
- Firebase Auth
- Firebase Firestore
- Firestore security rules

## Local Development

### V1

Open the file directly in a browser:

```text
v1/index.html
```

### V2 React App

```bash
cd v2-app
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

## Firebase Setup

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for Firebase project notes and Firestore rules deployment.

Current Firebase project ID:

```text
fun-with-math-bd66c
```

Deploy Firestore rules from the repo root:

```bash
npx firebase-tools deploy --only firestore:rules --project fun-with-math-bd66c
```

## Version History

### MVP

- Launched the initial playable arithmetic game.
- Added duration selection from 1-5 minutes.
- Added operation selection for addition, subtraction, multiplication, and division.
- Added digit selection for 1-digit, 2-digit, and 3-digit problems.
- Added candy-based rewards.
- Added question generation rules to avoid negative subtraction answers and non-whole division answers.

### V1.1

- Added question counter during gameplay.
- Added questions solved to the result screen.
- Added correct answer count to the result screen.
- Added Enter key support.
- Added input auto-focus.
- Added back/home control from the game screen.
- Added simple countdown clock animation.
- Improved end messages for different candy totals.
- Replaced repeated candy emoji rows with a single candy graphic.

### V1.2

- Added a gentle home screen before setup.
- Added "Play Now" and "View Progress" actions.
- Added motivational last-session candy messaging.
- Added local progress tracking with `localStorage`.
- Added lifetime candies, last session candies, and recent session history.
- Added reset progress flow.
- Removed correct answers from recent session cards to keep progress less score-like.
- Added in-memory fallback for progress rendering.
- Improved timer-end behavior so games reliably move to results.
- Added short grace handling for final Enter/Submit at 0:00.

### V2.1

- Added the React/Vite app in `v2-app`.
- Added Firebase Auth Google sign-in.
- Added sign-out.
- Added auth-state tracking with `onAuthStateChanged`.
- Displayed the signed-in user's name and email.
- Kept the app login-only.

### V2.2

- Saved Firebase user profiles after Google login.
- Wrote profile documents to `users/{uid}` in Firestore.
- Stored `uid`, `displayName`, `email`, `photoURL`, `createdAt`, and `lastLoginAt`.
- Preserved `createdAt` for returning users.
- Updated `lastLoginAt` on each sign-in.
- Kept the app login-only.

### V2.3

- Added repo-tracked Firestore rules in `firestore.rules`.
- Added `firebase.json` for Firebase tooling.
- Added `FIREBASE_SETUP.md`.
- Restricted user profile reads/writes to the signed-in owner.
- Validated the expected user profile shape.
- Denied client-side profile deletes.
- Deployed the Firestore rules to Firebase.

### V3

- Rebuilt the V1.2 math practice flow in React.
- Kept Google login and sign-out.
- Added a signed-in home screen.
- Added setup, gameplay, results, and progress screens.
- Saved completed sessions to Firestore at `users/{uid}/sessions/{sessionId}`.
- Read recent sessions and lifetime candies from Firestore.
- Updated Firestore rules for session data.
- Kept the same candy-first, low-pressure experience from V1.2.

### V3.1

- Polished the Candy Progress screen visual hierarchy.
- Made lifetime candies and last-session cards the primary focus.
- Replaced recent-session cards with a compact Candy Timeline.
- Kept the main progress screen focused on the latest 5 sessions.
- Added a separate scrollable All Candy Rounds screen for older sessions.
- Removed redundant progress Refresh buttons now that progress is Firestore-backed.
- Polished the post-game result screen.
- Added a subtle 5-star result animation based on correct-answer percentage.
- Kept candies collected as the main reward focus.

### V4

- Added operation-level and digit-level stats to saved sessions.
- Added expandable recent-session details with correct/attempted counts.
- Added gentle practice recommendations based on recent operation and digit performance.
- Highlighted recommendation targets in setup.
- Added mobile gameplay usability improvements:
  - Handheld on-screen keypad.
  - Submit button required for answers.
  - Stable mobile gameplay layout.
  - Visible timer and feedback messaging.
- Added visual feedback for correct and incorrect answers.
- Added friendly loading, empty, offline, and save-state messaging.
- Added responsive no-scroll layout polish for small screens.
- Refined post-game result hierarchy, short messages, larger mobile result cards, and confetti celebration for strong rounds.

### V5 - Pending

- Parent trust polish.
- Parent-friendly context around how progress is saved and used.
- Clearer privacy/safety language.
- Optional adult-facing progress visibility.
- Keep all adult-facing analytics separate from the child-facing reward loop.

Current app does not include:

- Parent dashboard.
- Multiple child profiles.
- Classroom mode.
- Migration of existing V1 localStorage data.
- Offline sync beyond graceful UI messaging.
