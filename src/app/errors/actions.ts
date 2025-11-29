
'use server';

import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

const { firestore } = initializeFirebase();

export async function getErrors() {
  const errorsQuery = query(collection(firestore, "errors"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(errorsQuery);
  const errorsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return errorsData;
}
