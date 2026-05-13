# Sërin Book Club

Public website for the Sërin reading community across AMU, AITU, and NU in Astana.

---

## Stack

React + Vite + TypeScript, Tailwind CSS v4, Firebase Firestore, Framer Motion. Deployed on Vercel.

## Pages

| Page | What it does |
|------|-------------|
| Home | Club description, campus info, FAQ |
| Events | Reading events per campus — vote or leave a review |
| Books | Reading list per campus |
| Activity | Stats — events, books, votes |

## Event statuses (auto-computed)

| Status | When |
|--------|------|
| Voting Open | Before start date, voting enabled |
| Upcoming | Before start date |
| Reading Now | Between start and end date |
| Finished | After end date — reviews section opens automatically |

The `date` field uses `"YYYY-MM-DD"` for single days or `"YYYY-MM-DD|YYYY-MM-DD"` for a range.

## Running locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Firestore collections

```
books/    { title, author, uniId, createdAt }
events/   { title, description, date, uniId, bookTitle, bookAuthor,
            hasVoting, votingOptions[], reviews[], createdAt }
```

Deploy Firestore rules from `FIRESTORE_RULES.txt` before going live.

---

Admin panel is a separate private repo. Ask club staff for access.
