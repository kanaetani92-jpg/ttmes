'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AssessmentData,
  Likert5,
  Likert5Value,
  Stage,
  buildAssessmentPayload,
  cloneAssessmentData,
  createDefaultAssessment,
  normalizeAssessmentData,
} from '@/lib/assessment';

const STORAGE_KEY = 'ttm-es';

const defaultData = createDefaultAssessment();

type AssessmentContext = {
  data: AssessmentData;
  setLikert: (path: string, index: number, val: Likert5) => void;
  setStage: (stage: Stage) => void;
  reset: () => void;
  hasHydrated: boolean;
};

const AssessmentCtx = createContext<AssessmentContext>({
  data: defaultData,
  setLikert: () => {},
  setStage: () => {},
  reset: () => {},
  hasHydrated: false,
});

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AssessmentData>(defaultData);
  const [hasHydrated, setHasHydrated] = useState(false);
  const skipNextPersist = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData(normalizeAssessmentData(parsed));
      }
    } catch (error) {
      console.error('Failed to restore assessment data', error);
    }
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, hasHydrated]);

  const setLikert = useCallback((path: string, index: number, val: Likert5) => {
    setData((prev) => {
      const next = cloneAssessmentData(prev);
      const arr = path.split('.').reduce<any>((acc, key) => acc[key], next) as Likert5Value[];
      arr[index] = val;
      return next;
    });
  }, []);

  const setStage = useCallback((stage: Stage) => {
    setData((prev) => ({ ...prev, stage }));
  }, []);

  const reset = useCallback(() => {
    skipNextPersist.current = true;
    localStorage.removeItem(STORAGE_KEY);
    setData(createDefaultAssessment());
  }, []);

  const api = useMemo<AssessmentContext>(
    () => ({
      data,
      setLikert,
      setStage,
      reset,
      hasHydrated,
    }),
    [data, hasHydrated, reset, setLikert, setStage],
  );

  return <AssessmentCtx.Provider value={api}>{children}</AssessmentCtx.Provider>;
}

export const useAssessment = () => useContext(AssessmentCtx);

export const buildAssessmentRequest = buildAssessmentPayload;
