
'use client';

import {
  useState,
  useEffect,
  useMemo,
} from 'react';
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAt,
  endAt,
  type DocumentData,
  type Query,
} from 'firebase/firestore';

interface UseCollectionOptions {
  where?: [string, any, any];
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
  startAt?: any;
  endAt?: any;
}

export function useCollection<T>(
  ref: Query | null,
  options?: UseCollectionOptions
) {
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const queryKey = useMemo(() => {
    let key = ref?.path;
    if (options?.where) key += `|${options.where.join('')}`;
    if (options?.orderBy) key += `|${options.orderBy.join('')}`;
    if (options?.limit) key += `|${options.limit}`;
    return key;
  }, [ref?.path, options]);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        try {
          const docs = snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as T)
          );
          setData(docs);
          setError(null);
        } catch (err: any) {
          setError(err);
          setData(null);
        } finally {
          setIsLoading(false);
        }
      },
      (err: any) => {
        setError(err);
        setIsLoading(false);
        setData(null);
      }
    );

    return () => unsubscribe();
  }, [queryKey]);

  return { data, isLoading, error };
}
