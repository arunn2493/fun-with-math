# Firebase Setup

This repo tracks Firestore rules for the React/Firebase app.

## Current Project

- Firebase project ID: `fun-with-math-bd66c`
- React app folder: `v2-app`
- Firestore rules file: `firestore.rules`

## Firestore Rules

V2.3 protects user profile documents at `users/{uid}`:

- A signed-in user can read only their own profile document.
- A signed-in user can create or update only their own profile document.
- Profile documents must contain only:
  - `uid`
  - `displayName`
  - `email`
  - `photoURL`
  - `createdAt`
  - `lastLoginAt`
- `createdAt` is set on create and cannot be changed later.
- `lastLoginAt` updates on each Google sign-in.
- Deletes are denied from the client.

V3 protects session documents at `users/{uid}/sessions/{sessionId}`:

- A signed-in user can read only their own session documents.
- A signed-in user can create only their own session documents.
- Session documents must contain only:
  - `id`
  - `uid`
  - `createdAt`
  - `candies`
  - `questionsAttempted`
  - `correctAnswers`
  - `durationMinutes`
  - `operations`
  - `digitLevels`
- `createdAt` is set on create.
- Client updates and deletes are denied.

## Deploy Rules

Install or use the Firebase CLI, then from the repo root run:

```bash
firebase deploy --only firestore:rules --project fun-with-math-bd66c
```

For local React app testing:

```bash
cd v2-app
npm run dev
```

Then sign in with Google, finish a round, and confirm Firestore writes to:

```text
users/{uid}
users/{uid}/sessions/{sessionId}
```
