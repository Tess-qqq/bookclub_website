import {
  collection, updateDoc, addDoc, doc, query,
  where, orderBy, onSnapshot, getDoc, serverTimestamp,
  type QuerySnapshot, type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type EventStatus = 'voting' | 'upcoming' | 'active' | 'past';

export interface VotingOption { id: string; title: string; author: string; votes: number; }

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
  hasVoting?: boolean;
  reviews?: any[];
  createdAt: any;
}

export function computeStatus(date: string, hasVoting?: boolean): EventStatus {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const parts  = date.split('|');
  const start  = new Date(parts[0]); start.setHours(0, 0, 0, 0);
  const end    = parts[1] ? new Date(parts[1]) : null; if (end) end.setHours(23, 59, 59, 999);
  if (today < start) return hasVoting ? 'voting' : 'upcoming';
  if (end && today > end) return 'past';
  return 'active';
}

function withStatus(d: any): BookEvent {
  return { id: d.id, ...d.data(), status: computeStatus(d.data().date, d.data().hasVoting) };
}

export function subscribeToEvents(uniId: string, callback: (events: BookEvent[]) => void) {
  const q = query(collection(db, 'events'), where('uniId', '==', uniId), orderBy('date', 'desc'));
  return onSnapshot(q,
    (snap: QuerySnapshot<DocumentData>) => callback(snap.docs.map(withStatus)),
    err => console.error('Events error:', err)
  );
}

function getStoredVote(id: string) { try { return localStorage.getItem(`vote_${id}`); } catch { return null; } }
function storeVote(id: string, optionId: string) { try { localStorage.setItem(`vote_${id}`, optionId); } catch {} }
export function getUserVote(id: string) { return getStoredVote(id); }

export async function castVote(eventId: string, optionId: string): Promise<void> {
  const existing = getStoredVote(eventId);
  if (existing === optionId) return;
  const ref  = doc(db, 'events', eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Event not found');
  const data = snap.data() as BookEvent;
  const opts = [...(data.votingOptions ?? [])];
  if (existing) { const p = opts.find(o => o.id === existing); if (p) p.votes = Math.max(0, p.votes - 1); }
  const t = opts.find(o => o.id === optionId);
  if (!t) throw new Error('Option not found');
  t.votes += 1;
  await updateDoc(ref, { votingOptions: opts });
  storeVote(eventId, optionId);
}

export async function postReview(eventId: string, text: string, author: string): Promise<void> {
  const ref  = doc(db, 'events', eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Not found');
  const reviews = [...(snap.data().reviews ?? [])];
  reviews.push({ id: `rev_${Date.now()}`, text: text.slice(0, 1000), author: author.slice(0, 50), createdAt: new Date().toISOString() });
  await updateDoc(ref, { reviews });
}
