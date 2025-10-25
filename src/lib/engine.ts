import catalog from '@/data/catalog.json';

export type Stage = 'PC' | 'C' | 'PR' | 'A' | 'M';

export type Scores = {
  stage: Stage;
  pssm: { self_efficacy: number };
  pdsm: { pros: number; cons: number };
  ppsm: { experiential: number; behavioral: number };
  risci: { stress: number; coping: number };
  sma: { planning: number; reframing: number; healthy_activity: number };
};

type Band = 'LOW'|'MID'|'HIGH'|'OK'|'ATTN';
type Banding = { id: string, label: string, range: [number, number] };

function inRange(v: number, r: [number, number]) { return v >= r[0] && v <= r[1]; }

function bandOf(bands: Banding[], v: number): string {
  const b = bands.find(b => inRange(v, b.range));
  if (!b) throw new Error(`value ${v} out of range`);
  return b.id;
}

export function computeBands(s: Scores) {
  const b: any = { stage: s.stage };

  const B = (path: string) => path.split('.').reduce((acc:any, k)=>acc[k], (catalog as any).bands);

  // RISCI
  b.RISCI = {
    stress: bandOf(B('RISCI.stress.banding'), s.risci.stress),
    coping: bandOf(B('RISCI.coping.banding'), s.risci.coping),
  };
  b.RISCI_presc = {
    stress: (B('RISCI.stress.prescription_collapsed') as any)[b.RISCI.stress],
    coping: (B('RISCI.coping.prescription_collapsed') as any)[b.RISCI.coping],
  };

  // SMA
  b.SMA = {
    planning: bandOf(B('SMA.planning.banding'), s.sma.planning),
    reframing: bandOf(B('SMA.reframing.banding'), s.sma.reframing),
    healthy_activity: bandOf(B('SMA.healthy_activity.banding'), s.sma.healthy_activity),
  };

  // PSSM
  b.PSSM = {
    self_efficacy: bandOf(B('PSSM.self_efficacy.banding'), s.pssm.self_efficacy),
  };

  // PDSM
  b.PDSM = {
    pros: bandOf(B('PDSM.pros.banding'), s.pdsm.pros),
    cons: bandOf(B('PDSM.cons.banding'), s.pdsm.cons),
  };

  // PPSM
  b.PPSM = {
    experiential: bandOf(B('PPSM.experiential.banding'), s.ppsm.experiential),
    behavioral: bandOf(B('PPSM.behavioral.banding'), s.ppsm.behavioral),
  };

  return b;
}

type Message = { id: string; stage?: Stage[]; bands?: Record<string,string>; template: any };

function pickById(id: string) {
  const messages = (catalog as any).messages as Record<string, Message[]>;
  const [ns] = id.split(':');

  const candidates = messages[ns] || messages[id];
  if (candidates?.length) {
    return candidates.find((m) => m.id === id) || candidates[0];
  }

  // Fallback: search every message group for the identifier
  for (const group of Object.values(messages) as Message[][]) {
    const found = group.find((m) => m.id === id);
    if (found) return found;
  }

  throw new Error(`message ${id} not found in catalog`);
}

function filterByStage(list: Message[], stage: Stage) {
  return list.filter(m => !m.stage || m.stage.includes(stage));
}

function findByBands(list: Message[], bands: Record<string,string>) {
  const keys = Object.keys(bands);
  const exact = list.find(m => {
    if (!m.bands) return false;
    return keys.every(k => m.bands![k] === bands[k]);
  });
  return exact || list.find(m => !m.bands) || list[0];
}

export function selectMessages(scores: Scores, opts?: { useGemini?: boolean }) {
  const stageLabels: Record<Stage,string> = { PC:'前熟考期', C:'熟考期', PR:'準備期', A:'実行期', M:'維持期' };

  const bands = computeBands(scores);
  const out: any[] = [];

  // Header
  const stageMessages = (catalog as any).messages['HEADER.STAGE'] as Message[];
  const stagePick = filterByStage(stageMessages, scores.stage)[0] || stageMessages[0];
  out.push(render(stagePick, { stage_label: stageLabels[scores.stage] }));

  // DB matrix
  const dbList = (catalog as any).messages['DB.MATRIX'] as Message[];
  const dbPick = findByBands(filterByStage(dbList, scores.stage),
    { pros: bands.PDSM.pros, cons: bands.PDSM.cons });
  out.push(render(dbPick, { stage_label: stageLabels[scores.stage] }));

  // Self-efficacy
  const seList = (catalog as any).messages['SE.BANDED'] as Message[];
  const sePick = findByBands(filterByStage(seList, scores.stage), { self_efficacy: bands.PSSM.self_efficacy });
  out.push(render(sePick, {}));

  // Processes
  if (['PC','C'].includes(scores.stage)) {
    const list = (catalog as any).messages['PROC.EXP'] as Message[];
    out.push(render(findByBands(filterByStage(list, scores.stage), { experiential: bands.PPSM.experiential }), {}));
  } else if (scores.stage === 'PR') {
    const list = (catalog as any).messages['PROC.EXP×BEH'] as Message[];
    out.push(render(findByBands(filterByStage(list, scores.stage), { experiential: bands.PPSM.experiential, behavioral: bands.PPSM.behavioral }), {}));
  } else {
    const list = (catalog as any).messages['PROC.BEH'] as Message[];
    out.push(render(findByBands(filterByStage(list, scores.stage), { behavioral: bands.PPSM.behavioral }), {}));
  }

  // RISCI detail
  const risciStressList = (catalog as any).messages['RISCI.STRESS'] as Message[];
  out.push(render(findByBands(filterByStage(risciStressList, scores.stage), { stress: bands.RISCI.stress }), {}));
  const risciCopingList = (catalog as any).messages['RISCI.COPING'] as Message[];
  out.push(render(findByBands(filterByStage(risciCopingList, scores.stage), { coping: bands.RISCI.coping }), {}));

  // SMA
  out.push(render(pickById(`SMA.PLANNING.${bands.SMA.planning}`), {}));
  out.push(render(pickById(`SMA.REFRAMING.${bands.SMA.reframing}`), {}));
  out.push(render(pickById(`SMA.HEALTHY.${bands.SMA.healthy_activity}`), {}));

  // Footer
  out.push(render(pickById('FOOTER.NEXT_STEP'), {}));
  return { items: out, bands };
}

function render(msg: any, vars: Record<string,any>) {
  const tmpl = msg.template || {};
  const interpolate = (s?: string) => (s||'').replace(/\{\{(.*?)\}\}/g, (_, k) => (vars[k.trim()] ?? ''));
  return {
    id: msg.id,
    title: interpolate(tmpl.title),
    body: interpolate(tmpl.body),
    suggested_actions: msg.suggested_actions || []
  };
}
