import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDoc,
  serverTimestamp,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Book {
  id?: string;
  title: string;
  author: string;
  uniId: 'AMU' | 'AITU' | 'NU';
  createdAt: any;
  thoughts?: Thought[];
}

export interface BookRequest {
  id?: string;
  title: string;
  author: string;
  uniId: 'AMU' | 'AITU' | 'NU';
  submittedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface Thought {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  edited?: boolean;
  ownerKey?: string;
}

export function subscribeToBooks(uniId: string, callback: (books: Book[]) => void) {
  const q = query(
    collection(db, 'books'),
    where('uniId', '==', uniId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Book[]),
    err => console.error('Books error:', err)
  );
}

// Live subscription to a single book — keeps thoughts in sync for all users
export function subscribeToBook(bookId: string, callback: (book: Book | null) => void) {
  return onSnapshot(
    doc(db, 'books', bookId),
    snap => callback(snap.exists() ? { id: snap.id, ...snap.data() } as Book : null),
    err => console.error('Book error:', err)
  );
}

export async function postThought(bookId: string, text: string, author: string, ownerKey: string): Promise<void> {
  const ref = doc(db, 'books', bookId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Book not found');
  const thoughts = [...(snap.data().thoughts ?? [])];
  thoughts.push({
    id: `th_${Date.now()}`,
    text: text.slice(0, 2000),
    author: author.slice(0, 50) || 'Anonymous',
    createdAt: new Date().toISOString(),
    ownerKey,
  });
  await updateDoc(ref, { thoughts });
}

export async function submitBookRequest(
  title: string,
  author: string,
  uniId: 'AMU' | 'AITU' | 'NU',
  submittedBy: string
): Promise<void> {
  await addDoc(collection(db, 'bookRequests'), {
    title: title.slice(0, 200),
    author: author.slice(0, 200),
    uniId,
    submittedBy: submittedBy.slice(0, 50) || 'Anonymous',
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export function subscribeToBookRequests(uniId: string, callback: (requests: BookRequest[]) => void) {
  const q = query(
    collection(db, 'bookRequests'),
    where('uniId', '==', uniId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })) as BookRequest[]),
    err => console.error('Book requests error:', err)
  );
}

export async function editThought(bookId: string, thoughtId: string, newText: string): Promise<void> {
  const ref = doc(db, 'books', bookId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Book not found');
  const thoughts = (snap.data().thoughts ?? []).map((t: Thought) =>
    t.id === thoughtId ? { ...t, text: newText.slice(0, 2000), edited: true } : t
  );
  await updateDoc(ref, { thoughts });
}

export async function deleteThought(bookId: string, thoughtId: string): Promise<void> {
  const ref = doc(db, 'books', bookId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Book not found');
  const thoughts = (snap.data().thoughts ?? []).filter((t: Thought) => t.id !== thoughtId);
  await updateDoc(ref, { thoughts });
}
