export type Likert5 = 1 | 2 | 3 | 4 | 5;
export type Stage = 'PC' | 'C' | 'PR' | 'A' | 'M';

export type Likert5Value = Likert5 | null;

export type AssessmentData = {
  stage: Stage;
  risci: { stress: Likert5Value[]; coping: Likert5Value[] };
  sma: { planning: Likert5Value[]; reframing: Likert5Value[]; healthy: Likert5Value[] };
  pssm: Likert5Value[];
  pdsm: { pros: Likert5Value[]; cons: Likert5Value[] };
  ppsm: { experiential: Likert5Value[]; behavioral: Likert5Value[] };
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
  risci: { stress: [null, null, null], coping: [null, null, null] },
  sma: { planning: [null, null], reframing: [null, null], healthy: [null, null] },
  pssm: [null, null, null, null, null],
  pdsm: { pros: [null, null, null], cons: [null, null, null] },
  ppsm: {
    experiential: [null, null, null, null, null],
    behavioral: [null, null, null, null, null],
  },
});

export const cloneAssessmentData = (data: AssessmentData): AssessmentData => ({
  stage: data.stage,
  risci: {
    stress: [...data.risci.stress] as Likert5Value[],
    coping: [...data.risci.coping] as Likert5Value[],
  },
  sma: {
    planning: [...data.sma.planning] as Likert5Value[],
    reframing: [...data.sma.reframing] as Likert5Value[],
    healthy: [...data.sma.healthy] as Likert5Value[],
  },
  pssm: [...data.pssm] as Likert5Value[],
  pdsm: {
    pros: [...data.pdsm.pros] as Likert5Value[],
    cons: [...data.pdsm.cons] as Likert5Value[],
  },
  ppsm: {
    experiential: [...data.ppsm.experiential] as Likert5Value[],
    behavioral: [...data.ppsm.behavioral] as Likert5Value[],
  },
});

const toLikert5 = (value: unknown, fallback: Likert5Value = null): Likert5Value => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric)) {
    const clamped = Math.round(numeric);
    if (clamped >= 1 && clamped <= 5) return clamped as Likert5;
  }
  return fallback;
};

const normalizeLikertArray = (input: unknown, length: number, fallback: Likert5Value[]): Likert5Value[] => {
  if (!Array.isArray(input)) return [...fallback] as Likert5Value[];
  const result: Likert5Value[] = [];
  for (let i = 0; i < length; i += 1) {
    result.push(toLikert5(input[i], fallback[i]));
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

const scoreOf = (value: unknown): number => {
  const parsed = toLikert5(value, null);
  return typeof parsed === 'number' ? parsed : 0;
};

const sum = (values: Likert5Value[]): number => values.reduce((acc, cur) => acc + scoreOf(cur), 0);

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
