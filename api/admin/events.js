const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

function initFirebase() {
  if (getApps().length > 0) return;
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = async function handler(req, res) {
  const origin = process.env.APP_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const pin = req.headers['x-admin-pin'];
  if (!pin || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    initFirebase();
    const db = getFirestore();

    // POST → create event
    if (req.method === 'POST') {
      const { title, description, date, status, uniId, bookTitle, bookAuthor, votingOptions } = req.body;

      if (!title || !date || !status || !uniId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      if (!['AMU', 'AITU', 'NU'].includes(uniId)) {
        return res.status(400).json({ error: 'Invalid uniId' });
      }
      if (!['voting', 'upcoming', 'active', 'past'].includes(status)) {
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
      if (status !== 'voting' && bookTitle) payload.bookTitle = String(bookTitle).slice(0, 200);
      if (status !== 'voting' && bookAuthor) payload.bookAuthor = String(bookAuthor).slice(0, 200);

      const ref = await db.collection('events').add(payload);
      return res.status(201).json({ id: ref.id });
    }

    // DELETE → delete event
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing event id' });
      await db.collection('events').doc(String(id)).delete();
      return res.status(200).json({ deleted: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Admin events error:', err);
    return res.status(500).json({ error: err.message });
  }
};
