import {
  collection,
  addDoc,
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

export async function postThought(bookId: string, text: string, author: string): Promise<void> {
  const ref = doc(db, 'books', bookId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Book not found');
  const thoughts = [...(snap.data().thoughts ?? [])];
  thoughts.push({
    id: `th_${Date.now()}`,
    text: text.slice(0, 500),
    author: author.slice(0, 50) || 'Anonymous',
    createdAt: new Date().toISOString(),
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
