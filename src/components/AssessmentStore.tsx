'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AssessmentData,
  Likert5,
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
};

const AssessmentCtx = createContext<AssessmentContext>({
  data: defaultData,
  setLikert: () => {},
  setStage: () => {},
  reset: () => {},
});

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AssessmentData>(defaultData);

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
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const api = useMemo<AssessmentContext>(() => ({
    data,
    setLikert: (path, index, val) => {
      setData((prev) => {
        const next = cloneAssessmentData(prev);
        const arr = path.split('.').reduce<any>((acc, key) => acc[key], next) as Likert5[];
        arr[index] = val;
        return next;
      });
    },
    setStage: (stage) => {
      setData((prev) => ({ ...prev, stage }));
    },
    reset: () => {
      setData(createDefaultAssessment());
      localStorage.removeItem(STORAGE_KEY);
    },
  }), [data]);

  return <AssessmentCtx.Provider value={api}>{children}</AssessmentCtx.Provider>;
}

export const useAssessment = () => useContext(AssessmentCtx);

export const buildAssessmentRequest = buildAssessmentPayload;
