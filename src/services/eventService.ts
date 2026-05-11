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

export async function createEvent(event: Omit<BookEvent, 'id' | 'createdAt'>): Promise<string> {
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

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId));
}

export async function addVotingOption(eventId: string, title: string, author: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Event not found');
  const data = snap.data() as BookEvent;
  const options = [...(data.votingOptions ?? [])];
  options.push({ id: `opt_${Date.now()}`, title, author, votes: 0 });
  await updateDoc(eventRef, { votingOptions: options });
}

export async function removeVotingOption(eventId: string, optionId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Event not found');
  const data = snap.data() as BookEvent;
  const options = (data.votingOptions ?? []).filter((o) => o.id !== optionId);
  await updateDoc(eventRef, { votingOptions: options });
}
