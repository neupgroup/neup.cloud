
'use server';

import { collection, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { firestore } = initializeFirebase();

type AppError = {
  id: string;
  message: string;
  level: 'ERROR' | 'WARNING' | 'INFO';
  source: string;
  timestamp: string; // Changed to string
  stack?: string;
};


export async function getErrors(): Promise<AppError[]> {
  const errorsQuery = query(collection(firestore, "errors"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(errorsQuery);
  const errorsData = querySnapshot.docs.map(doc => {
    const data = doc.data();
    const timestamp = data.timestamp as Timestamp;
    return {
      id: doc.id,
      ...data,
      timestamp: timestamp.toDate().toISOString(), // Convert to ISO string
    } as AppError;
  });
  return errorsData;
}
