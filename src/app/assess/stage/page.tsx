'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react'; // type MouseEvent を削除
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import type { Stage } from '@/lib/assessment';

type StageOption = { id: Stage; label: string };

const OPTIONS: StageOption[] = [
  {
    id: 'PC',
    label: 'いいえ。そして、私は、6ヶ月以内に効果的なストレスマネジメント行動を始める意図はありません。',
  },
  {
    id: 'C',
    label: 'いいえ。しかし、私は、6ヶ月以内に効果的なストレスマネジメント行動を始める意図があります。',
  },
  {
    id: 'PR',
    label: 'いいえ。しかし、私は、30日以内に効果的なストレスマネジメント行動を始める意図があります。',
  },
  {
    id: 'A',
    label: 'はい。私は、30日以内に効果的なストレスマネジメント行動を実践していますが、始めてから6ヶ月以内です。',
  },
  {
    id: 'M',
    label: 'はい。私は、30日以内に効果的なストレスマネジメント行動を実践していますが、始めてから6ヶ月以上になります。',
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
  // ⛔️ stageError state を削除
  
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
      // ⛔️ setStageError(null) を削除
      persistStage(nextStage);
    },
    [setAssessmentStage],
  );

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
    // ⛔️ setStageError(null) を削除
    clearStoredStage();
    router.replace(restartPath);
  }, [restartPath, restartToken, router]);

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
          ステージ分類
        </div>
        <h2 className="text-xl font-bold">変容ステージ</h2>
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
              <div className="font-medium leading-relaxed">{opt.label}</div>
            </label>
          ))}
        </div>

        {/* ⛔️ stageErrorの表示部分を削除 */}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link className="btn" href={nextPath}>
            次へ（RISCIへ進む）
          </Link>
        </div>
      </div>
    </div>
  );
}
