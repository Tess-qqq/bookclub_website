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

export function subscribeToEvents(uniId: string, callback: (events: BookEvent[]) => void) {
  const q = query(
    collection(db, 'events'),
    where('uniId', '==', uniId),
    orderBy('date', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BookEvent[]);
    },
    (err) => console.error('Events error:', err)
  );
}

function getStoredVote(eventId: string): string | null {
  try { return localStorage.getItem(`vote_${eventId}`); } catch { return null; }
}
function storeVote(eventId: string, optionId: string) {
  try { localStorage.setItem(`vote_${eventId}`, optionId); } catch { }
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

  await updateDoc(eventRef, { votingOptions: options });
  storeVote(eventId, optionId);
}
