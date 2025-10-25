'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import type { Stage } from '@/lib/assessment';

type StageOption = { id: Stage; stageLabel: string; description: string };

const OPTIONS: StageOption[] = [
  {
    id: 'PC',
    stageLabel: '前熟考期：',
    description:
      'いいえ。そして、私は、6ヶ月以内に効果的なストレスマネジメント行動を始める意図はありません。',
  },
  {
    id: 'C',
    stageLabel: '熟考期：',
    description:
      'いいえ。しかし、私は、6ヶ月以内に効果的なストレスマネジメント行動を始める意図があります。',
  },
  {
    id: 'PR',
    stageLabel: '準備期：',
    description:
      'いいえ。しかし、私は、30日以内に効果的なストレスマネジメント行動を始める意図があります。',
  },
  {
    id: 'A',
    stageLabel: '実行期：',
    description:
      'はい。私は、30日以内に効果的なストレスマネジメント行動を実践していますが、始めてから6ヶ月以内です。',
  },
  {
    id: 'M',
    stageLabel: '維持期：',
    description:
      'はい。私は、30日以内に効果的なストレスマネジメント行動を実践していますが、始めてから6ヶ月以上になります。',
  },
];

const STORAGE_KEY = 'ttm-es';

type StoredData = { stage?: Stage } & Record<string, unknown>;

const isStage = (value: unknown): value is Stage =>
  value === 'PC' || value === 'C' || value === 'PR' || value === 'A' || value === 'M';

const loadStoredStage = (): Stage | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredData;
    return isStage(parsed.stage) ? parsed.stage : null;
  } catch (error) {
    console.error('Failed to restore stage from localStorage', error);
    return null;
  }
};

const persistStage = (nextStage: Stage) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data: StoredData = raw ? (JSON.parse(raw) as StoredData) : {};
    data.stage = nextStage;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to persist stage', error);
  }
};

const clearStoredStage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const data: StoredData = JSON.parse(raw) as StoredData;
    if ('stage' in data) {
      delete data.stage;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (error) {
    console.error('Failed to clear stage from localStorage', error);
  }
};

export default function StagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setStage: setAssessmentStage } = useAssessment();
  const [stage, setStage] = useState<Stage | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);

  // 既存保存値を読み込み（任意）
  useEffect(() => {
    const storedStage = loadStoredStage();
    if (!storedStage) {
      return;
    }

    setStage(storedStage);
    setAssessmentStage(storedStage);
  }, [setAssessmentStage]);

  const handleSelect = useCallback(
    (nextStage: Stage) => {
      setStage(nextStage);
      setAssessmentStage(nextStage);
      setStageError(null);
      persistStage(nextStage);
    },
    [setAssessmentStage],
  );

  const handleNextClick = useCallback(() => {
    if (!stage) {
      setStageError('ステージを選択してください。');
      return;
    }

    setStageError(null);
    persistStage(stage);
    setAssessmentStage(stage);
    router.push(nextPath);
  }, [nextPath, router, setAssessmentStage, stage]);

  const restartToken = searchParams.get('restart');
  const searchParamsString = searchParams.toString();

  const sanitizedQuery = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    params.delete('restart');
    return params.toString();
  }, [searchParamsString]);

  const nextPath = useMemo(
    () => `/assess/risci${sanitizedQuery ? `?${sanitizedQuery}` : ''}`,
    [sanitizedQuery],
  );

  const restartPath = useMemo(
    () => `/assess/stage${sanitizedQuery ? `?${sanitizedQuery}` : ''}`,
    [sanitizedQuery],
  );

  useEffect(() => {
    if (!restartToken) return;
    setStage(null);
    setStageError(null);
    clearStoredStage();
    router.replace(restartPath);
  }, [restartPath, restartToken, router]);

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">ステージ分類</div>
        <h2 className="text-xl font-bold">設問1：変容ステージ</h2>
      </header>

      <div className="card p-5 space-y-3">
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            ストレスマネジメント行動とは、1日に20分以上、規則的にリラクセーションしたり、身体活動をしたり、だれかと話をしたり、社会的な活動に参加するなど、ストレスをコントロールするために役立つ健康に役立つ活動を言います。
          </p>
          <p className="text-white">
            あなたは日常生活の中で、このような効果的なストレスマネジメント行動を実践していますか。
          </p>
        </div>

        <div className="space-y-2">
          {OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                stage === opt.id ? 'border-blue-400 bg-[#13214a]' : 'border-[#2a315a] bg-[#0e1330]'
              } cursor-pointer`}
            >
              <input
                type="radio"
                name="stage"
                value={opt.id}
                checked={stage === opt.id}
                onChange={() => handleSelect(opt.id)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{opt.stageLabel}</div>
                <div className="text-xs text-gray-400">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>

        {stageError && <div className="text-sm text-red-300">{stageError}</div>}

        <div className="flex gap-2">
          <button className="btn" type="button" onClick={handleNextClick}>
            次へ（RISCIへ進む）
          </button>
        </div>
      </div>
    </div>
  );
}
