// api/admin/events.js
// Vercel Serverless Function — handles admin-only event creation and deletion.
// The ADMIN_PIN env var is checked server-side so the real PIN never ships to
// the browser bundle.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initFirebase() {
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Vercel env vars don't preserve newlines — replace \\n back to \n
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');
}

export default async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const pin = req.headers['x-admin-pin'];
  if (!pin || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  initFirebase();
  const db = getFirestore();

  // ── POST /api/admin/events  →  create event ───────────────────────────────
  if (req.method === 'POST') {
    const { title, description, date, status, uniId, bookTitle, bookAuthor, votingOptions } = req.body;

    if (!title || !date || !status || !uniId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['AMU', 'AITU', 'NU'].includes(uniId)) {
      return res.status(400).json({ error: 'Invalid uniId' });
    }

    const validStatuses = ['voting', 'upcoming', 'active', 'past'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const payload = {
      title: String(title).slice(0, 200),
      description: String(description || '').slice(0, 1000),
      date: String(date),
      status,
      uniId,
      votingOptions: Array.isArray(votingOptions) ? votingOptions : [],
      createdAt: new Date(),
    };

    if (status !== 'voting') {
      if (bookTitle) payload.bookTitle = String(bookTitle).slice(0, 200);
      if (bookAuthor) payload.bookAuthor = String(bookAuthor).slice(0, 200);
    }

    const ref = await db.collection('events').add(payload);
    return res.status(201).json({ id: ref.id });
  }

  // ── DELETE /api/admin/events?id=xxx  →  delete event ─────────────────────
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing event id' });
    await db.collection('events').doc(id).delete();
    return res.status(200).json({ deleted: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
