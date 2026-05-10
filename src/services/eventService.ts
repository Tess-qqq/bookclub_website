import {
  collection,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type EventStatus = 'voting' | 'upcoming' | 'active' | 'past';

export interface BookEvent {
  id?: string;
  title: string;
  uniId: 'AMU' | 'AITU' | 'NU';
  status: EventStatus;
  description: string;
  date: string;
  votingOptions?: VotingOption[];
  bookTitle?: string;
  bookAuthor?: string;
  createdAt: any;
}

export interface VotingOption {
  id: string;
  title: string;
  author: string;
  votes: number;
}

// ── Admin PIN ─────────────────────────────────────────────────────────────────
// The PIN is also validated server-side in /api/admin/events.
// We expose a client-side check only to gate UI elements.
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || 'serin2024';

export function checkAdminPin(pin: string): boolean {
  return pin === ADMIN_PIN;
}

// ── API base URL ──────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_APP_URL || '';

async function adminFetch(
  path: string,
  method: string,
  pin: string,
  body?: object
): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-pin': pin,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

// ── Events ────────────────────────────────────────────────────────────────────

export function subscribeToEvents(
  uniId: string,
  callback: (events: BookEvent[]) => void
) {
  const q = query(
    collection(db, 'events'),
    where('uniId', '==', uniId),
    orderBy('date', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BookEvent[];
      callback(events);
    },
    (err) => console.error('Events snapshot error:', err)
  );
}

export async function createEvent(
  pin: string,
  event: Omit<BookEvent, 'id' | 'createdAt'>
): Promise<string> {
  const res = await adminFetch('/api/admin/events', 'POST', pin, event);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.id as string;
}

export async function deleteEvent(pin: string, eventId: string): Promise<void> {
  const res = await adminFetch(`/api/admin/events?id=${eventId}`, 'DELETE', pin);
  if (!res.ok) throw new Error(await res.text());
}

// ── Voting (client-side, Firestore directly) ──────────────────────────────────

function getStoredVote(eventId: string): string | null {
  try { return localStorage.getItem(`vote_${eventId}`); } catch { return null; }
}

function storeVote(eventId: string, optionId: string) {
  try { localStorage.setItem(`vote_${eventId}`, optionId); } catch { /* noop */ }
}

export function getUserVote(eventId: string): string | null {
  return getStoredVote(eventId);
}

export async function castVote(eventId: string, optionId: string): Promise<void> {
  const existing = getStoredVote(eventId);
  if (existing === optionId) return;

  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Event not found');

  const eventData = snap.data() as BookEvent;
  const options = [...(eventData.votingOptions ?? [])];

  if (existing) {
    const prev = options.find((o) => o.id === existing);
    if (prev) prev.votes = Math.max(0, prev.votes - 1);
  }

  const target = options.find((o) => o.id === optionId);
  if (!target) throw new Error('Option not found');
  target.votes += 1;

  // updateDoc with only the votingOptions field — matches Firestore rule
  await updateDoc(eventRef, {
    votingOptions: options,
    // echo back the immutable fields so the rule's size check passes
    uniId: eventData.uniId,
    status: eventData.status,
    title: eventData.title,
    date: eventData.date,
    description: eventData.description ?? '',
    ...(eventData.bookTitle !== undefined ? { bookTitle: eventData.bookTitle } : {}),
    ...(eventData.bookAuthor !== undefined ? { bookAuthor: eventData.bookAuthor } : {}),
    createdAt: eventData.createdAt,
  });
  storeVote(eventId, optionId);
}

// ── Admin: voting options (via Firestore directly is fine since voting update rule covers it)

export async function addVotingOption(
  eventId: string,
  title: string,
  author: string
): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Event not found');

  const eventData = snap.data() as BookEvent;
  const options = [...(eventData.votingOptions ?? [])];
  options.push({ id: `opt_${Date.now()}`, title, author, votes: 0 });

  await updateDoc(eventRef, {
    votingOptions: options,
    uniId: eventData.uniId,
    status: eventData.status,
    title: eventData.title,
    date: eventData.date,
    description: eventData.description ?? '',
    ...(eventData.bookTitle !== undefined ? { bookTitle: eventData.bookTitle } : {}),
    ...(eventData.bookAuthor !== undefined ? { bookAuthor: eventData.bookAuthor } : {}),
    createdAt: eventData.createdAt,
  });
}

export async function removeVotingOption(eventId: string, optionId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Event not found');

  const eventData = snap.data() as BookEvent;
  const options = (eventData.votingOptions ?? []).filter((o) => o.id !== optionId);

  await updateDoc(eventRef, {
    votingOptions: options,
    uniId: eventData.uniId,
    status: eventData.status,
    title: eventData.title,
    date: eventData.date,
    description: eventData.description ?? '',
    ...(eventData.bookTitle !== undefined ? { bookTitle: eventData.bookTitle } : {}),
    ...(eventData.bookAuthor !== undefined ? { bookAuthor: eventData.bookAuthor } : {}),
    createdAt: eventData.createdAt,
  });
}
