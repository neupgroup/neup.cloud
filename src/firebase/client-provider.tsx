
'use client';

import { type PropsWithChildren } from 'react';
import { FirebaseProvider, type FirebaseContextValue } from './provider';
import { initializeFirebase } from '.';

export function FirebaseClientProvider({ children }: PropsWithChildren) {
  const { firebaseApp, auth, firestore } = initializeFirebase();

  const value: FirebaseContextValue = {
    firebaseApp,
    auth,
    firestore,
  };
  return <FirebaseProvider value={value}>{children}</FirebaseProvider>;
}
