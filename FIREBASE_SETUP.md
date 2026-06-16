# Firebase Setup

This repo tracks Firestore rules for the V2 React/Firebase app.

## Current Project

- Firebase project ID: `fun-with-math-bd66c`
- V2 app folder: `v2-app`
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

## Deploy Rules

Install or use the Firebase CLI, then from the repo root run:

```bash
firebase deploy --only firestore:rules --project fun-with-math-bd66c
```

For local V2 app testing:

```bash
cd v2-app
npm run dev
```

Then sign in with Google and confirm Firestore writes to `users/{uid}`.
