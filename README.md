# Serin Family Book Club

Minimalist book club site for AMU, AITU, and NU — now with **Book Events** and **Voting**.

## What's new

| Feature | Who can use it |
|---|---|
| View book events | Everyone |
| Vote on next book | Everyone (one vote per browser) |
| Create / delete events | Admin only |
| Add / remove voting options | Admin only |

## Admin access

A small 🔒 lock icon sits in the top-right header. Click it, enter the PIN, and you'll unlock admin mode. Admin mode is session-only (refreshing logs you out — this is intentional).

The PIN is validated **twice**:
1. Client-side (gates the UI buttons)
2. Server-side in `/api/admin/events` (the Vercel function actually checks the `x-admin-pin` header before touching Firestore)

## Deploying to Vercel

1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add these **Environment Variables** in Vercel → Settings → Environment Variables:

   | Key | Value |
   |---|---|
   | `VITE_ADMIN_PIN` | Your chosen PIN (shown in browser) |
   | `ADMIN_PIN` | Same PIN (checked server-side) |
   | `FIREBASE_PROJECT_ID` | From Firebase console |
   | `FIREBASE_CLIENT_EMAIL` | From Service Account JSON |
   | `FIREBASE_PRIVATE_KEY` | From Service Account JSON (paste the full key) |
   | `APP_URL` | Your Vercel deployment URL |

4. Deploy — Vercel auto-detects Vite + the `/api` folder.

## Firestore rules

Deploy the updated `firestore.rules` via Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

Events are public-read. Creating and deleting events goes through the server API route (blocked at Firestore rules level for direct client writes). Voting updates go directly to Firestore but the rules restrict what fields can change.

## Local dev

```bash
npm install
cp .env.example .env.local  # fill in your values
npm run dev
```

The `/api/admin/events` route needs the Firebase Admin SDK credentials even locally. For local dev you can temporarily open Firestore rules or use the Firebase emulator.
