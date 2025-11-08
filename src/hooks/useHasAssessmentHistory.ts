'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebaseClient';

type HistoryState = {
  hasHistory: boolean;
  loading: boolean;
};

let cachedResult: { userId: string; hasHistory: boolean } | null = null;
const pendingChecks = new Map<string, Promise<boolean>>();

export function useHasAssessmentHistory(): HistoryState {
  const [hasHistory, setHasHistory] = useState<boolean>(cachedResult?.hasHistory ?? false);
  const [loading, setLoading] = useState<boolean>(!cachedResult);

  useEffect(() => {
    let active = true;
    let currentUserId: string | null = null;

    async function check() {
      try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) {
          cachedResult = null;
          if (active) {
            setHasHistory(false);
            setLoading(false);
          }
          return;
        }

        currentUserId = user.uid;

        if (cachedResult?.userId === user.uid) {
          if (active) {
            setHasHistory(cachedResult.hasHistory);
            setLoading(false);
          }
          return;
        }

        cachedResult = null;
        if (active) {
          setHasHistory(false);
          setLoading(true);
        }

        let promise = pendingChecks.get(user.uid);
        if (!promise) {
          promise = (async () => {
            const db = getFirebaseDb();
            const assessmentsRef = collection(db, 'users', user.uid, 'assessments');
            const snapshot = await getDocs(query(assessmentsRef, limit(1)));
            return !snapshot.empty;
          })();
          pendingChecks.set(user.uid, promise);
        }

        const result = await promise;
        pendingChecks.delete(user.uid);
        if (!active) {
          return;
        }

        cachedResult = { userId: user.uid, hasHistory: result };
        setHasHistory(result);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load assessment history status', error);
        if (currentUserId) {
          pendingChecks.delete(currentUserId);
        }
        cachedResult = null;
        if (active) {
          setHasHistory(false);
          setLoading(false);
        }
      }
    }

    void check();

    return () => {
      active = false;
    };
  }, []);

  return { hasHistory, loading };
}
