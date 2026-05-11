import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  serverTimestamp,
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

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || 'serin2024';

export function checkAdminPin(pin: string): boolean {
  return pin === ADMIN_PIN;
}

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
  _pin: string,
  event: Omit<BookEvent, 'id' | 'createdAt'>
): Promise<string> {
  const payload: any = {
    title: event.title,
    description: event.description || '',
    date: event.date,
    status: event.status,
    uniId: event.uniId,
    votingOptions: event.votingOptions ?? [],
    createdAt: serverTimestamp(),
  };
  if (event.bookTitle) payload.bookTitle = event.bookTitle;
  if (event.bookAuthor) payload.bookAuthor = event.bookAuthor;

  const ref = await addDoc(collection(db, 'events'), payload);
  return ref.id;
}

export async function deleteEvent(_pin: string, eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId));
}

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

  await updateDoc(eventRef, { votingOptions: options });
  storeVote(eventId, optionId);
}

export async function addVotingOption(eventId: string, title: string, author: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Event not found');

  const eventData = snap.data() as BookEvent;
  const options = [...(eventData.votingOptions ?? [])];
  options.push({ id: `opt_${Date.now()}`, title, author, votes: 0 });
  await updateDoc(eventRef, { votingOptions: options });
}

export async function removeVotingOption(eventId: string, optionId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Event not found');

  const eventData = snap.data() as BookEvent;
  const options = (eventData.votingOptions ?? []).filter((o) => o.id !== optionId);
  await updateDoc(eventRef, { votingOptions: options });
}
