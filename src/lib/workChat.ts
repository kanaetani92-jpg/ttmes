import { Stage } from './assessment';

export const DEFAULT_STAGE: Stage = 'PC';

type StageDetail = {
  id: Stage;
  stageName: string;
  baseDescription: string;
  coachingStrategy: string;
  choices: string[];
};

const CALL_TO_ACTION = 'まずは、以下の選択肢から取り組んでみたいことを選んでみましょう。';

const stageDetails: Record<Stage, StageDetail> = {
  PC: {
    id: 'PC',
    stageName: '前熟考期',
    baseDescription:
      'あなたの現在のステージは【前熟考期】です。\n\n行動変容への関心が低い、または全くない段階です。行動のメリットを伝え、関心を引くような情報提供が有効です。無理強いはせず、まずは考えてみるきっかけを与えましょう。目標は「行動変容への関心を持つこと」です。',
    coachingStrategy:
      'このユーザーとの対話の最終目標は、行動変容への関心を持たせ、次の「熟考期」へ移行する準備を整えることです。',
    choices: [
      '自分のストレス反応のパターンを知る',
      'ストレス対策を始めるメリットを考える',
      'ストレスに関する簡単な情報収集から始める',
    ],
  },
  C: {
    id: 'C',
    stageName: '熟考期',
    baseDescription:
      'あなたの現在のステージは【熟考期】です。\n\n行動変容に関心はあるものの、行動のメリットとデメリットの間で葛藤している段階です。意思決定のバランス（メリット＞デメリット）が取れるよう支援し、行動への自信（自己効力感）を高める手助けが有効です。目標は「具体的な行動計画の準備を始めること」です。',
    coachingStrategy:
      'このユーザーとの対話の最終目標は、行動への両価性を解消し、具体的な計画を立てる「準備期」へ移行する自信と決意を固める手助けをすることです。',
    choices: [
      '行動のメリット・デメリットを詳しく整理する',
      '行動を変えた後の理想の自分を想像してみる',
      '行動するための自信が今どのくらいあるか確認する',
    ],
  },
  PR: {
    id: 'PR',
    stageName: '準備期',
    baseDescription:
      'あなたの現在のステージは【準備期】です。\n\n近い将来（例：1ヶ月以内）に行動を起こす意思がある段階です。具体的で達成可能な小さな目標を設定し、行動計画を立てるサポートが重要です。いつ、どこで、何をするかを明確にしましょう。目標は「行動を開始すること」です。',
    coachingStrategy:
      'このユーザーとの対話の最終目標は、具体的で現実的な行動計画を完成させ、実際に行動を開始する「実行期」へスムーズに移行させることです。',
    choices: [
      '達成可能な小さな目標を設定する',
      '「いつ・どこで・何をするか」具体的な計画を立てる',
      '誰かに協力を求めることを考えてみる',
    ],
  },
  A: {
    id: 'A',
    stageName: '実行期',
    baseDescription:
      'あなたの現在のステージは【実行期】です。\n\n行動を始めてから6ヶ月未満の段階です。最も後戻り（スリップ）しやすい時期なので、継続を支えるための具体的な戦略（ご褒美、周囲のサポート、妨害要因の排除など）が有効です。目標は「行動を維持し、習慣化すること」です。',
    coachingStrategy:
      'このユーザーとの対話の最終目標は、行動を継続し習慣化するためのスキルを身につけさせ、6ヶ月以上継続できる「維持期」へ移行するサポートをすることです。',
    choices: [
      'うまくいった時の「ご褒美」を考える',
      'ついやってしまう行動の「代わりになる行動」を探す',
      '困った時に相談できる人や場所を確認する',
    ],
  },
  M: {
    id: 'M',
    stageName: '維持期',
    baseDescription:
      'あなたの現在のステージは【維持期】です。\n\n行動を6ヶ月以上継続できている段階です。後戻りのリスクは減っていますが、油断は禁物です。行動を続けるための工夫や、さらなるステップアップについて話し合うのが良いでしょう。目標は「行動の完全な習慣化と、後戻りの防止」です。',
    coachingStrategy:
      'このユーザーとの対話の最終目標は、現在の行動を確実に維持し、後戻りを防ぐための戦略を強化することです。新たな目標設定も視野に入れますが、基本は「維持」のサポートです。',
    choices: [
      '後戻りを防ぐための計画を立てる',
      'これまでの頑張りを振り返って自信を深める',
      'さらにレベルアップする方法を考える',
    ],
  },
};

export type StageMetadata = StageDetail & {
  description: string;
  systemDescription: string;
};

export const getStageMetadata = (stage: Stage | null | undefined): StageMetadata => {
  const key = stage ?? DEFAULT_STAGE;
  const detail = stageDetails[key];
  return {
    ...detail,
    description: `${detail.baseDescription}\n\n${CALL_TO_ACTION}`,
    systemDescription: detail.baseDescription,
  };
};

export const toStageName = (stage: Stage): string => stageDetails[stage].stageName;
