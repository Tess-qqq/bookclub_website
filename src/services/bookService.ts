import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  type QuerySnapshot,
  type DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'anonymous', // As per user request: no registration
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface Book {
  id?: string;
  title: string;
  author: string;
  uniId: 'AMU' | 'AITU' | 'NU';
  createdAt: any;
}

const BOOKS_PATH = 'books';

export async function addBook(book: Omit<Book, 'id' | 'createdAt'>) {
  try {
    await addDoc(collection(db, BOOKS_PATH), {
      ...book,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, BOOKS_PATH);
  }
}

export function subscribeToBooks(uniId: string, callback: (books: Book[]) => void) {
  const q = query(
    collection(db, BOOKS_PATH),
    where('uniId', '==', uniId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
    const books = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Book[];
    callback(books);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, BOOKS_PATH);
  });
}
