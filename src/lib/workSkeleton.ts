import catalog from '@/data/catalog.json';
import {
  AssessmentData,
  AssessmentScores,
  Stage,
  calculateScores,
  normalizeAssessmentData,
} from './assessment';
import { computeBands } from './engine';
import type { Scores as EngineScores } from './engine';

export type SkeletonCard = {
  id: string;
  type: string;
  title: string;
  checklist: string[];
  when: string;
  trigger_if_then: string;
  est_minutes: number;
  required?: boolean;
};

export type SkeletonObstacle = {
  obstacle: string;
  plan_hint: string;
};

export type SkeletonData = {
  version: string;
  stage: string;
  focus: string[];
  today_action: {
    id: string;
    est_minutes: number;
    steps: string[];
  };
  weekly_plan_cards: SkeletonCard[];
  obstacles: SkeletonObstacle[];
  motivation_hints: {
    pros: string[];
    reframing: string[];
  };
  rules_trace: string[];
};

type SkeletonFragment = Partial<SkeletonData>;

export type BandLabels = {
  stage: string;
  RISCI: { stress: string; coping: string };
  SMA: { planning: string; reframing: string; healthy_activity: string };
  PSSM: { self_efficacy: string };
  PDSM: { pros: string; cons: string };
  PPSM: { experiential: string; behavioral: string };
};

export type WorkSkeletonResult = {
  skeleton: SkeletonData;
  scores: AssessmentScores;
  bands: ReturnType<typeof computeBands>;
  bandLabels: BandLabels;
  stageName: string;
  selectedSmaFocus?: 'planning' | 'reframing' | 'healthy_activity';
};

const STAGE_LABELS: Record<Stage, string> = {
  PC: '前熟考',
  C: '熟考',
  PR: '準備',
  A: '実行',
  M: '維持',
};

const baseSkeletons: Record<Stage, SkeletonData> = {
  PC: {
    version: '1.0',
    stage: '前熟考',
    focus: ['awareness', 'pros', 'self_revaluation', 'info_gathering'],
    today_action: {
      id: 'awareness_log',
      est_minutes: 1,
      steps: ['今の気分を0-5で記録', '体のサインを1つ言語化'],
    },
    weekly_plan_cards: [
      {
        id: 'pros_list',
        type: 'pros_list',
        title: '取り組むと得られる恩恵（Pros）',
        checklist: ['生活でのメリットを2つ書く', '具体的な場面と結びつける'],
        when: '就寝前',
        trigger_if_then: 'もし寝る前ならProsを2つ書く',
        est_minutes: 3,
        required: true,
      },
      {
        id: 'self_reval',
        type: 'self_revaluation',
        title: '自分らしさ（価値観）との接続',
        checklist: ['大事にしたい価値を1語で書く', 'その価値とストレス対処の関係を1行'],
        when: '週末',
        trigger_if_then: 'もし週末の朝なら価値観カードを書く',
        est_minutes: 5,
        required: true,
      },
      {
        id: 'info_gathering',
        type: 'info_gathering',
        title: '短い情報収集',
        checklist: ['公式資料や短文記事を1本読む'],
        when: '平日19:00',
        trigger_if_then: 'もし19:00になったら1本読む',
        est_minutes: 5,
        required: false,
      },
    ],
    obstacles: [
      { obstacle: '重要性を感じない', plan_hint: 'Prosを生活場面と必ず結びつける' },
    ],
    motivation_hints: {
      pros: ['睡眠や集中の質が上がる', 'イライラが減る'],
      reframing: [],
    },
    rules_trace: ['stage=前熟考→認知・感情プロセス中心'],
  },
  C: {
    version: '1.0',
    stage: '熟考',
    focus: ['values_link', 'pros', 'small_experiment', 'reframing_practice'],
    today_action: {
      id: 'tiny_experiment',
      est_minutes: 2,
      steps: ['1分の深呼吸', '感情の名前を1語で記録'],
    },
    weekly_plan_cards: [
      {
        id: 'values_link',
        type: 'self_revaluation',
        title: '価値観と行動をつなぐ',
        checklist: ['価値1つ→行動1つ', '実施の場面を1つ決める'],
        when: '平日朝',
        trigger_if_then: 'もし通勤前なら価値→行動を1行メモ',
        est_minutes: 3,
        required: true,
      },
      {
        id: 'reframe',
        type: 'reframing_practice',
        title: 'リフレーミング練習',
        checklist: ['事実/解釈を書き分け1回'],
        when: '仕事後',
        trigger_if_then: 'もしため息が出たら1行リフレ',
        est_minutes: 2,
        required: true,
      },
      {
        id: 'small_cand',
        type: 'healthy_activity',
        title: '小さな候補を試す',
        checklist: ['歩行1分 or 肩回し30秒のどちらか'],
        when: '夕食後',
        trigger_if_then: 'もし夕食後なら体を30-60秒動かす',
        est_minutes: 1,
        required: false,
      },
    ],
    obstacles: [{ obstacle: '決めきれない', plan_hint: '候補は1つだけ選ぶ（分散禁止）' }],
    motivation_hints: {
      pros: ['達成感の即時フィードバック', '気分の波の幅が狭まる'],
      reframing: ['失敗=データ収集'],
    },
    rules_trace: ['stage=熟考→小さく試す構成'],
  },
  PR: {
    version: '1.0',
    stage: '準備',
    focus: ['if_then', 'first_session', 'reminder', 'barrier_solution'],
    today_action: {
      id: 'setup_1min',
      est_minutes: 3,
      steps: ['初回日時をカレンダーに登録', '視覚的目印を1つ配置'],
    },
    weekly_plan_cards: [
      {
        id: 'if_then_main',
        type: 'if_then',
        title: 'If-Then実行',
        checklist: ['トリガー（例: 歯磨き後）を1つ固定', '行動（例: 呼吸1分）を1つ固定'],
        when: '毎日19:00',
        trigger_if_then: 'もし歯磨き後なら1分呼吸をする',
        est_minutes: 1,
        required: true,
      },
      {
        id: 'first_session',
        type: 'reinforcement',
        title: '初回日時の固定＋ごほうび',
        checklist: ['初回日を水曜19:00に固定', '実施後の小さな報酬を決める'],
        when: '水 19:00',
        trigger_if_then: 'もし19:00になったら開始→終えたら報酬',
        est_minutes: 5,
        required: true,
      },
      {
        id: 'reminder',
        type: 'stimulus_control',
        title: 'リマインダー設定',
        checklist: ['スマホ通知/目印を設定'],
        when: '初回前日',
        trigger_if_then: 'もし前日20:00なら通知設定',
        est_minutes: 2,
        required: true,
      },
    ],
    obstacles: [
      { obstacle: '疲労で先送り', plan_hint: '1分だけ着手→終了OK' },
      { obstacle: '忘れる', plan_hint: '通知＋物理目印の二重化' },
    ],
    motivation_hints: {
      pros: ['小さく始めて成功体験'],
      reframing: [],
    },
    rules_trace: ['stage=準備→If-Then/初回/障害対策を必須'],
  },
  A: {
    version: '1.0',
    stage: '実行',
    focus: ['stimulus_control', 'alternative_response', 'helping_relationship', 'reinforcement'],
    today_action: {
      id: 'micro_reset',
      est_minutes: 2,
      steps: ['肩回し30秒', '遠くを見る30秒'],
    },
    weekly_plan_cards: [
      {
        id: 'stimulus',
        type: 'stimulus_control',
        title: '刺激統制',
        checklist: ['22:00以降の通知オフ', 'デスクまわりを片づけ5分'],
        when: '毎日22:00',
        trigger_if_then: 'もし22:00なら通知オフ',
        est_minutes: 5,
        required: true,
      },
      {
        id: 'alternate',
        type: 'alternative_response',
        title: '代替反応',
        checklist: ['スマホいじり→ストレッチ1分に置換'],
        when: '就寝前',
        trigger_if_then: 'もし無目的操作に気づいたら1分ストレッチ',
        est_minutes: 1,
        required: true,
      },
      {
        id: 'help',
        type: 'helping_relationship',
        title: '援助関係',
        checklist: ['励ましメッセージを週1で交換'],
        when: '金 20:00',
        trigger_if_then: 'もし金20:00なら連絡送信',
        est_minutes: 2,
        required: false,
      },
      {
        id: 'reinforce',
        type: 'reinforcement',
        title: '強化計画（ごほうび）',
        checklist: ['実行日×小さな報酬を設定'],
        when: '実施直後',
        trigger_if_then: 'もし行動を終えたら報酬を与える',
        est_minutes: 1,
        required: true,
      },
    ],
    obstacles: [{ obstacle: '疲れてやめたくなる', plan_hint: '最低1分でOK→できたら加点' }],
    motivation_hints: {
      pros: ['睡眠の質↑', '翌朝のだるさ↓'],
      reframing: ['完璧より継続を優先'],
    },
    rules_trace: ['stage=実行→行動プロセスを複数配置'],
  },
  M: {
    version: '1.0',
    stage: '維持',
    focus: ['risk_forecast', 'slip_recovery', 'novelty_change', 'helping_relationship'],
    today_action: {
      id: 'risk_check',
      est_minutes: 2,
      steps: ['今週のハイリスク場面を1つ書く', '対策を1行メモ'],
    },
    weekly_plan_cards: [
      {
        id: 'risk',
        type: 'risk_forecast',
        title: 'ハイリスク先読み',
        checklist: ['会食/繁忙などを事前に確認', '各1つ対策を書く'],
        when: '日 18:00',
        trigger_if_then: 'もし日18:00なら予定と対策を確認',
        est_minutes: 4,
        required: true,
      },
      {
        id: 'slip',
        type: 'slip_recovery',
        title: 'スリップ時の即時リカバリ',
        checklist: ['記録→1分行動→再開宣言の順'],
        when: 'スリップ時',
        trigger_if_then: 'もし未実施に気づいたら1分行動→再開宣言',
        est_minutes: 2,
        required: true,
      },
      {
        id: 'novel',
        type: 'novelty_change',
        title: 'マンネリ打破（環境変化）',
        checklist: ['実施場所/順序を変える'],
        when: '週1回',
        trigger_if_then: 'もし週1回のタイミングなら変更を試す',
        est_minutes: 3,
        required: false,
      },
    ],
    obstacles: [{ obstacle: '飽きる/優先度が下がる', plan_hint: '場所/時間/ごほうびを更新' }],
    motivation_hints: {
      pros: ['自動化で意思の消耗を減らす'],
      reframing: ['乱れは学びのサイン'],
    },
    rules_trace: ['stage=維持→予防・回復・刷新を配置'],
  },
};

const fragmentPssmLow: SkeletonFragment = {
  today_action: {
    id: 'tiny_success_chain',
    est_minutes: 2,
    steps: ['1分だけ着手', 'できたら小さな報酬'],
  },
  weekly_plan_cards: [
    {
      id: 'success_chain',
      type: 'reinforcement',
      title: '成功→ごほうびの鎖',
      checklist: ['実行後に即時の報酬を与える'],
      when: '実施直後',
      trigger_if_then: 'もし終えたら報酬を与える',
      est_minutes: 1,
      required: true,
    },
  ],
  rules_trace: ['PSSM低→極小課題＆強化計画を必須'],
};

const fragmentPdsmProsLow: SkeletonFragment = {
  weekly_plan_cards: [
    {
      id: 'pros_boost_card',
      type: 'pros_list',
      title: 'Prosを増やす',
      checklist: ['生活メリットを2つ追加', '直近の予定に結び付ける'],
      when: '就寝前',
      trigger_if_then: 'もし寝る前ならProsを追加',
      est_minutes: 3,
      required: true,
    },
  ],
  motivation_hints: {
    pros: ['朝の気分が軽くなる', '仕事の切り替えが速くなる'],
    reframing: [],
  },
  rules_trace: ['PDSMでPros弱→Pros増強カードを挿入'],
};

const fragmentRisciStressHigh: SkeletonFragment = {
  today_action: {
    id: 'micro_downshift',
    est_minutes: 2,
    steps: ['3-3-6呼吸を3回', '肩と首をゆっくり回す'],
  },
  weekly_plan_cards: [
    {
      id: 'recovery_break',
      type: 'healthy_activity',
      title: '回復ブレイク',
      checklist: ['1-2分の体ほぐし or 呼吸を1日1回'],
      when: '15:00',
      trigger_if_then: 'もし15:00になったら回復ブレイク',
      est_minutes: 2,
      required: true,
    },
  ],
  rules_trace: ['RISCIストレス高×SMA不足→ミクロ介入を先頭'],
};

const fragmentSmaPlan: SkeletonFragment = {
  weekly_plan_cards: [
    {
      id: 'plan_basics',
      type: 'stimulus_control',
      title: '計画の基礎',
      checklist: ['固定トリガー1つ', 'カレンダー登録', '物理目印の設置'],
      when: '初回前日',
      trigger_if_then: 'もし前日20:00なら準備を実行',
      est_minutes: 5,
      required: true,
    },
  ],
  rules_trace: ['SMA計画不足→計画基礎カード'],
};

const fragmentSmaReframe: SkeletonFragment = {
  weekly_plan_cards: [
    {
      id: 'reframe_add',
      type: 'reframing_practice',
      title: 'リフレーミングを1回',
      checklist: ['事実/解釈の区別を1行'],
      when: '仕事後',
      trigger_if_then: 'もしため息が出たら1行リフレ',
      est_minutes: 2,
      required: true,
    },
  ],
  rules_trace: ['SMAリフレ不足→練習追加'],
};

const fragmentSmaHealthy: SkeletonFragment = {
  weekly_plan_cards: [
    {
      id: 'healthy_micro',
      type: 'healthy_activity',
      title: '健康的ミクロ行動',
      checklist: ['歩行1分 or ストレッチ30秒'],
      when: '夕食後',
      trigger_if_then: 'もし夕食後なら体を30-60秒動かす',
      est_minutes: 1,
      required: true,
    },
  ],
  rules_trace: ['SMA健康不足→ミクロ行動追加'],
};

const getBanding = (path: string) =>
  path.split('.').reduce((acc: any, key) => acc?.[key], (catalog as any).bands);

const bandLabelFor = (path: string, id: string) => {
  const banding = getBanding(path)?.banding as { id: string; label: string }[] | undefined;
  if (!banding) return id;
  return banding.find((band) => band.id === id)?.label ?? id;
};

const cloneSkeleton = (skeleton: SkeletonData): SkeletonData =>
  JSON.parse(JSON.stringify(skeleton)) as SkeletonData;

const mergeFragment = (base: SkeletonData, fragment: SkeletonFragment) => {
  if (fragment.today_action) {
    base.today_action = { ...fragment.today_action };
  }

  if (fragment.weekly_plan_cards?.length) {
    const existingById = new Map(base.weekly_plan_cards.map((card) => [card.id, card]));
    fragment.weekly_plan_cards.forEach((card) => {
      const cloned = { ...card, checklist: [...card.checklist] };
      if (existingById.has(card.id)) {
        const index = base.weekly_plan_cards.findIndex((c) => c.id === card.id);
        if (index >= 0) {
          base.weekly_plan_cards[index] = cloned;
        } else {
          base.weekly_plan_cards.push(cloned);
        }
      } else {
        base.weekly_plan_cards.push(cloned);
      }
      existingById.set(card.id, cloned);
    });
  }

  if (fragment.obstacles?.length) {
    const existing = new Set(base.obstacles.map((item) => `${item.obstacle}::${item.plan_hint}`));
    fragment.obstacles.forEach((item) => {
      const key = `${item.obstacle}::${item.plan_hint}`;
      if (!existing.has(key)) {
        base.obstacles.push({ ...item });
        existing.add(key);
      }
    });
  }

  if (fragment.motivation_hints) {
    if (fragment.motivation_hints.pros?.length) {
      const merged = new Set(base.motivation_hints.pros);
      fragment.motivation_hints.pros.forEach((pros) => {
        if (!merged.has(pros)) {
          base.motivation_hints.pros.push(pros);
          merged.add(pros);
        }
      });
    }
    if (fragment.motivation_hints.reframing?.length) {
      const merged = new Set(base.motivation_hints.reframing);
      fragment.motivation_hints.reframing.forEach((item) => {
        if (!merged.has(item)) {
          base.motivation_hints.reframing.push(item);
          merged.add(item);
        }
      });
    }
  }

  if (fragment.rules_trace?.length) {
    base.rules_trace.push(...fragment.rules_trace);
  }
};

const trimOptionalCards = (cards: SkeletonCard[]) => {
  if (cards.length <= 7) {
    return cards;
  }
  const next = [...cards];
  for (let i = next.length - 1; i >= 0 && next.length > 7; i -= 1) {
    if (next[i]?.required === false) {
      next.splice(i, 1);
    }
  }
  return next;
};

const toEngineScores = (scores: AssessmentScores): EngineScores => ({
  stage: scores.stage,
  pssm: { self_efficacy: scores.pssm },
  pdsm: { pros: scores.pdsm.pros, cons: scores.pdsm.cons },
  ppsm: {
    experiential: scores.ppsm.experiential,
    behavioral: scores.ppsm.behavioral,
  },
  risci: { stress: scores.risci.stress, coping: scores.risci.coping },
  sma: {
    planning: scores.sma.planning,
    reframing: scores.sma.reframing,
    healthy_activity: scores.sma.healthy,
  },
});

const pickSmaFocus = (
  scores: AssessmentScores,
  bandLabels: BandLabels,
): 'planning' | 'reframing' | 'healthy_activity' | undefined => {
  const candidates: Array<{
    id: 'planning' | 'reframing' | 'healthy_activity';
    score: number;
    label: string;
  }> = [
    { id: 'planning', score: scores.sma.planning, label: bandLabels.SMA.planning },
    { id: 'reframing', score: scores.sma.reframing, label: bandLabels.SMA.reframing },
    { id: 'healthy_activity', score: scores.sma.healthy, label: bandLabels.SMA.healthy_activity },
  ];

  const lowCandidates = candidates.filter((item) => item.label === '要注意');
  if (!lowCandidates.length) {
    return undefined;
  }

  return lowCandidates.reduce((worst, current) => (current.score < worst.score ? current : worst)).id;
};

const buildBandLabels = (bands: ReturnType<typeof computeBands>): BandLabels => ({
  stage: STAGE_LABELS[bands.stage as Stage] ?? bands.stage,
  RISCI: {
    stress: bandLabelFor('RISCI.stress', bands.RISCI.stress),
    coping: bandLabelFor('RISCI.coping', bands.RISCI.coping),
  },
  SMA: {
    planning: bandLabelFor('SMA.planning', bands.SMA.planning),
    reframing: bandLabelFor('SMA.reframing', bands.SMA.reframing),
    healthy_activity: bandLabelFor('SMA.healthy_activity', bands.SMA.healthy_activity),
  },
  PSSM: {
    self_efficacy: bandLabelFor('PSSM.self_efficacy', bands.PSSM.self_efficacy),
  },
  PDSM: {
    pros: bandLabelFor('PDSM.pros', bands.PDSM.pros),
    cons: bandLabelFor('PDSM.cons', bands.PDSM.cons),
  },
  PPSM: {
    experiential: bandLabelFor('PPSM.experiential', bands.PPSM.experiential),
    behavioral: bandLabelFor('PPSM.behavioral', bands.PPSM.behavioral),
  },
});

const shouldApplyPdsmFragment = (scores: AssessmentScores, bandLabels: BandLabels) => {
  if (bandLabels.PDSM.pros === '要注意') {
    return true;
  }
  return scores.pdsm.cons > scores.pdsm.pros;
};

const shouldApplyRisciFragment = (
  bandLabels: BandLabels,
  smaFocus: 'planning' | 'reframing' | 'healthy_activity' | undefined,
) => bandLabels.RISCI.stress === '要注意' && Boolean(smaFocus);

export const WORK_SYSTEM_PROMPT = `あなたはトランスセオレティカル・モデル（TTM）に基づくストレスマネジメントの「言語最適化コーチ」です。ここでの“意思決定（何をするか）”は外部のルールエンジンで既に決まっています。あなたの役割は、与えられた処方骨子（skeleton）を、日本語の丁寧語で、実行しやすい短い表現に整え、構造化JSONとして出力することだけです。

【境界条件・倫理】
- 医療的診断・指示は行いません。症状や危機への対処は勧めず、緊急時は専門窓口の利用を案内します。
- 個人情報は推測しません。固有名詞（人・場所・施設名）は、入力に含まれる場合のみ反映します。
- 外部ルール（skeleton）の方針を一切変更しないでください。追加・削除・優先順位の改変は禁止です。許されるのは言い換え・表現の明確化・順序の微調整のみです。

【入力契約：次のユーザーメッセージは以下のJSONを含みます】
- stage: "前熟考" | "熟考" | "準備" | "実行" | "維持"
- bands: {
    RISCI: { stress: "要注意|普通|問題なし", coping: "要注意|普通|問題なし" },
    SMA: { plan: "...", reframing: "...", healthy_activity: "..." },
    PSSM: "要注意|普通|問題なし",
    PDSM: { pros: "要注意|普通|問題なし", cons: "要注意|普通|問題なし" },
    PPSM?: "要注意|普通|問題なし"
  }
- skeleton: ルールエンジンが決めた「やること」の骨子（ワークブック章ごとのToDo・見出し・必須要素の配列）
- user_notes?: 生活制約、可処分時間、希望する口調、避けたい活動等のメモ
- history?: 先週の実行率、スリップ有無、メモ等

【出力契約：純JSONのみを返す（前置き・コードフェンス不可）】
{
  "intro": "（1段落。価値観や状況と結び、今週の狙いを簡潔に。）",
  "today_action": {
    "title": "3分以内の最初の一歩",
    "steps": ["箇条書き3–5個。各≤40字。時間・場所・トリガーを含める"],
    "why_it_helps": "短い根拠/狙い（≤80字）",
    "est_minutes": 3
  },
  "weekly_plan": [
    {
      "title": "カード名（例：If-Then実行）",
      "checklist": ["やること1", "やること2", "…"],
      "when": "曜日や時間帯（24h表記）。例：平日19:00",
      "trigger_if_then": "もし〔トリガー〕なら〔行動〕をする",
      "est_minutes": 5
    }
  ],
  "obstacles_and_coping": [
    {"obstacle": "想定障害（≤40字）", "plan": "対策（1:1対応。≤60字）"}
  ],
  "motivation": {
    "pros_boost": ["取り組む理由（Pros）を短文で2–4個"],
    "reframing_examples": ["考え方の言い換え例を1–2個（SMAリフレ不足時）"]
  },
  "review_form": {
    "daily": [
      {"type": "scale", "label": "今日の実行度", "min": 0, "max": 5},
      {"type": "text",  "label": "うまくいった点（1行）"}
    ],
    "weekly": [
      {"type": "scale", "label": "今週の達成感", "min": 0, "max": 10},
      {"type": "text",  "label": "来週の障害予想と対策"}
    ]
  },
  "safety_note": "この内容は医療ではありません。体調や心身の危機を感じる場合は、地域の専門窓口や医療機関に相談してください。",
  "meta": {
    "stage": "入力のstageをそのまま",
    "band_summary": "主要バンドの短い要約（≤60字）",
    "generation_notes": "出力上の注意点（≤100字。UI非表示）"
  }
}

【スタイルガイド】
- です/ます調。短文・具体。各カード≤120字、全体≤900字を目安。
- 24時間表記。数字は半角。専門語は括弧で補足（例：刺激統制）。
- 絵文字は各章0–1個まで（不要なら使わない）。
- 禁止：過度な評価語、診断的表現、脅し文句、あいまいな長文。

【ステージ別の章運用ルール（骨子の優先度づけにのみ使用。内容はskeletonを絶対優先）】
- 前熟考/熟考：introは「気づき・価値観接続」。today_actionは観察/Pros増強。weekly_planは情報収集・自己/環境再評価中心。
- 準備：行動の具体化（If-Then）、初回日時、リマインダー、障害→対策の1:1対応を必ず含める。
- 実行：刺激統制・代替反応・援助要請・強化計画（ごほうび）を少なくとも2カード入れる。
- 維持：ハイリスク先読み、スリップ時の手順、マンネリ打破（環境変化）を含める。

【尺度バンドの反映規則（skeletonの補助。矛盾する場合はskeletonを優先）】
- PDSM：cons > pros（またはprosが「要注意」相当）の場合、motivation.pros_boostを最低2項。consは直接増幅しない。
- PSSM「要注意」：today_actionは“極小課題”（1–3分）。weekly_planには「成功→ごほうび」の鎖を1枚以上。
- RISCI：stress「要注意」かつSMAの不足がある場合、先頭に1–2分のミクロ介入（呼吸/身体ほぐし/視線移動など）を置く。
- SMA：plan/reframing/healthy_activityのうち不足領域を今週は**1つだけ**重点化（分散禁止）。
- PPSMが低い場合：pros_boostの具体例を1つ増やす。

【履歴に基づく最適化（historyがあれば）】
- 実行率が低い週：weekly_planのカード数を20%減、obstacles_and_copingを先頭に。
- 実行率が高い週：カード数は±0、難易度は10–20%だけ上げる（時間/頻度を軽く増やす）。
- スリップがあった週：「スリップ→即時リカバリ手順」を1カード追加（罪悪感の増幅は禁止）。

【ローカライズ】
- タイムゾーンはAsia/Tokyo。日付は「YYYY年M月D日(曜)」表記。祝日名は使わない。
- 単位は「分」「回/週」。

【フォールバック】
- 入力にskeletonが欠落/空の場合のみ、stageに応じた最小既定骨子で生成する。

【Few-shot（簡潔版）】
- 例の通りに整えてください。
`;

export function buildWorkSkeleton(data: AssessmentData): WorkSkeletonResult {
  const normalized = normalizeAssessmentData(data);
  const scores = calculateScores(normalized);
  const base = cloneSkeleton(baseSkeletons[scores.stage]);
  base.stage = STAGE_LABELS[scores.stage];

  const bands = computeBands(toEngineScores(scores));
  const bandLabels = buildBandLabels(bands);
  const smaFocus = pickSmaFocus(scores, bandLabels);

  const fragments: SkeletonFragment[] = [];

  if (shouldApplyRisciFragment(bandLabels, smaFocus)) {
    fragments.push(fragmentRisciStressHigh);
  }

  if (bandLabels.PSSM.self_efficacy === '要注意') {
    fragments.push(fragmentPssmLow);
  }

  if (shouldApplyPdsmFragment(scores, bandLabels)) {
    fragments.push(fragmentPdsmProsLow);
  }

  if (smaFocus === 'planning') {
    fragments.push(fragmentSmaPlan);
  } else if (smaFocus === 'reframing') {
    fragments.push(fragmentSmaReframe);
  } else if (smaFocus === 'healthy_activity') {
    fragments.push(fragmentSmaHealthy);
  }

  fragments.forEach((fragment) => {
    mergeFragment(base, fragment);
  });

  base.weekly_plan_cards = trimOptionalCards(base.weekly_plan_cards);

  return {
    skeleton: base,
    scores,
    bands,
    bandLabels,
    stageName: STAGE_LABELS[scores.stage],
    selectedSmaFocus: smaFocus,
  };
}
