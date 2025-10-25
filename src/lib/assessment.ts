export type Likert5 = 1 | 2 | 3 | 4 | 5;
export type Stage = 'PC' | 'C' | 'PR' | 'A' | 'M';

export type AssessmentData = {
  stage: Stage;
  risci: { stress: Likert5[]; coping: Likert5[] };
  sma: { planning: Likert5[]; reframing: Likert5[]; healthy: Likert5[] };
  pssm: Likert5[];
  pdsm: { pros: Likert5[]; cons: Likert5[] };
  ppsm: { experiential: Likert5[]; behavioral: Likert5[] };
};

export type AssessmentScores = {
  stage: Stage;
  risci: { stress: number; coping: number };
  sma: { planning: number; reframing: number; healthy: number };
  pssm: number;
  pdsm: { pros: number; cons: number };
  ppsm: { experiential: number; behavioral: number };
};

export const createDefaultAssessment = (): AssessmentData => ({
  stage: 'C',
  risci: { stress: [3, 3, 3], coping: [3, 3, 3] },
  sma: { planning: [3, 3], reframing: [3, 3], healthy: [3, 3] },
  pssm: [3, 3, 3, 3, 3],
  pdsm: { pros: [3, 3, 3], cons: [3, 3, 3] },
  ppsm: { experiential: [3, 3, 3, 3, 3], behavioral: [3, 3, 3, 3, 3] },
});

export const cloneAssessmentData = (data: AssessmentData): AssessmentData => ({
  stage: data.stage,
  risci: {
    stress: [...data.risci.stress] as Likert5[],
    coping: [...data.risci.coping] as Likert5[],
  },
  sma: {
    planning: [...data.sma.planning] as Likert5[],
    reframing: [...data.sma.reframing] as Likert5[],
    healthy: [...data.sma.healthy] as Likert5[],
  },
  pssm: [...data.pssm] as Likert5[],
  pdsm: {
    pros: [...data.pdsm.pros] as Likert5[],
    cons: [...data.pdsm.cons] as Likert5[],
  },
  ppsm: {
    experiential: [...data.ppsm.experiential] as Likert5[],
    behavioral: [...data.ppsm.behavioral] as Likert5[],
  },
});

const toLikert5 = (value: number, fallback: Likert5 = 3): Likert5 => {
  if (Number.isFinite(value)) {
    const clamped = Math.round(value);
    if (clamped >= 1 && clamped <= 5) return clamped as Likert5;
  }
  return fallback;
};

const normalizeLikertArray = (input: unknown, length: number, fallback: Likert5[]): Likert5[] => {
  if (!Array.isArray(input)) return [...fallback] as Likert5[];
  const result: Likert5[] = [];
  for (let i = 0; i < length; i += 1) {
    result.push(toLikert5(Number(input[i]), fallback[i]));
  }
  return result;
};

const normalizeStage = (value: unknown, fallback: Stage): Stage => {
  if (value === 'PC' || value === 'C' || value === 'PR' || value === 'A' || value === 'M') {
    return value;
  }
  return fallback;
};

export const normalizeAssessmentData = (raw: unknown): AssessmentData => {
  const base = createDefaultAssessment();
  if (!raw || typeof raw !== 'object') return base;
  const data = raw as Partial<AssessmentData> & Record<string, any>;
  return {
    stage: normalizeStage(data.stage, base.stage),
    risci: {
      stress: normalizeLikertArray(data.risci?.stress, base.risci.stress.length, base.risci.stress),
      coping: normalizeLikertArray(data.risci?.coping, base.risci.coping.length, base.risci.coping),
    },
    sma: {
      planning: normalizeLikertArray(data.sma?.planning, base.sma.planning.length, base.sma.planning),
      reframing: normalizeLikertArray(data.sma?.reframing, base.sma.reframing.length, base.sma.reframing),
      healthy: normalizeLikertArray(data.sma?.healthy, base.sma.healthy.length, base.sma.healthy),
    },
    pssm: normalizeLikertArray(data.pssm, base.pssm.length, base.pssm),
    pdsm: {
      pros: normalizeLikertArray(data.pdsm?.pros, base.pdsm.pros.length, base.pdsm.pros),
      cons: normalizeLikertArray(data.pdsm?.cons, base.pdsm.cons.length, base.pdsm.cons),
    },
    ppsm: {
      experiential: normalizeLikertArray(
        data.ppsm?.experiential,
        base.ppsm.experiential.length,
        base.ppsm.experiential,
      ),
      behavioral: normalizeLikertArray(
        data.ppsm?.behavioral,
        base.ppsm.behavioral.length,
        base.ppsm.behavioral,
      ),
    },
  };
};

const sum = (values: Likert5[]): number => values.reduce((acc, cur) => acc + cur, 0);

export const calculateScores = (data: AssessmentData): AssessmentScores => ({
  stage: data.stage,
  risci: {
    stress: sum(data.risci.stress),
    coping: sum(data.risci.coping),
  },
  sma: {
    planning: sum(data.sma.planning),
    reframing: sum(data.sma.reframing),
    healthy: sum(data.sma.healthy),
  },
  pssm: sum(data.pssm),
  pdsm: {
    pros: sum(data.pdsm.pros),
    cons: sum(data.pdsm.cons),
  },
  ppsm: {
    experiential: sum(data.ppsm.experiential),
    behavioral: sum(data.ppsm.behavioral),
  },
});

export const buildAssessmentPayload = (data: AssessmentData) => {
  const scores = calculateScores(data);
  return {
    scores: {
      stage: scores.stage,
      pssm: { self_efficacy: scores.pssm },
      pdsm: { pros: scores.pdsm.pros, cons: scores.pdsm.cons },
      ppsm: { experiential: scores.ppsm.experiential, behavioral: scores.ppsm.behavioral },
      risci: { stress: scores.risci.stress, coping: scores.risci.coping },
      sma: {
        planning: scores.sma.planning,
        reframing: scores.sma.reframing,
        healthy_activity: scores.sma.healthy,
      },
    },
    useGemini: false,
  };
};

export const STAGE_LABELS: Record<Stage, string> = {
  PC: '前熟考 🤔',
  C: '熟考 🧠💭',
  PR: '準備 🗓️📝',
  A: '実行 🚀',
  M: '維持 🌱🔁',
};
