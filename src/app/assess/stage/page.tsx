'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import type { Stage } from '@/lib/assessment';

type StageOption = { id: Stage; label: string; helper: string };

const OPTIONS: StageOption[] = [
  {
    id: 'PC',
    label: 'いいえ（6か月以内に始める意図はない）',
    helper: '前熟考期：まだ始めるつもりはない',
  },
  {
    id: 'C',
    label: 'いいえ（6か月以内に始める意図がある）',
    helper: '熟考期：半年以内に始めたい',
  },
  {
    id: 'PR',
    label: 'いいえ（30日以内に始める意図がある）',
    helper: '準備期：1か月以内に始める予定',
  },
  {
    id: 'A',
    label: 'はい（直近30日も実践／開始から6か月未満）',
    helper: '実行期：はじめてから6か月未満',
  },
  {
    id: 'M',
    label: 'はい（直近30日も実践／開始から6か月以上）',
    helper: '維持期：はじめてから6か月以上',
  },
];

const STORAGE_KEY = 'ttm-es';

type StoredData = { stage?: Stage } & Record<string, unknown>;

const isStage = (value: unknown): value is Stage =>
  value === 'PC' || value === 'C' || value === 'PR' || value === 'A' || value === 'M';

export default function StagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setStage: setAssessmentStage } = useAssessment();
  const [stage, setStage] = useState<Stage | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);

  // 既存保存値を読み込み（任意）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredData;
        if (isStage(parsed.stage)) {
          setStage(parsed.stage);
          setAssessmentStage(parsed.stage);
        }
      }
    } catch (error) {
      console.error('Failed to restore stage from localStorage', error);
    }
  }, [setAssessmentStage]);

  function persistStage(nextStage: Stage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const data: StoredData = raw ? (JSON.parse(raw) as StoredData) : {};
      data.stage = nextStage;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist stage', error);
    }
  }

  function handleSelect(nextStage: Stage) {
    setStage(nextStage);
    setAssessmentStage(nextStage);
    setStageError(null);
    persistStage(nextStage);
  }

  function saveAndNext() {
    if (!stage) {
      setStageError('ステージを選択してください。');
      return;
    }
    setStageError(null);

    persistStage(stage);
    setAssessmentStage(stage);
    router.push('/assess/risci');
  }

  const restartToken = searchParams.get('restart');
  const searchParamsString = searchParams.toString();

  useEffect(() => {
    if (!restartToken) return;
    setStage(null);
    setStageError(null);
    const params = new URLSearchParams(searchParamsString);
    params.delete('restart');
    const query = params.toString();
    router.replace(`/assess/stage${query ? `?${query}` : ''}`);
  }, [restartToken, router, searchParamsString]);

  return (
    <div className="space-y-4">
      <header className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">ステージ分類</div>
        <h2 className="text-xl font-bold">設問1：変容ステージ</h2>
      </header>

      <div className="card p-5 space-y-3">
        <div className="space-y-1">
          <div className="font-semibold">「効果的なストレスマネジメント行動」の定義</div>
          <p className="text-sm text-gray-300">
            <b>1日に20分以上</b>、規則的にリラクセーションや身体活動をしたり、だれかと話をしたり、
            社会的な活動に参加するなど、ストレスをコントロールするのに役立つ健康的な活動。
          </p>
        </div>

        <div className="space-y-2">
          <div className="font-semibold">質問</div>
          <p className="text-sm">
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
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.helper}</div>
              </div>
            </label>
          ))}
        </div>

        {stageError && <div className="text-sm text-red-300">{stageError}</div>}

        <div className="flex gap-2">
          <button className="btn" onClick={saveAndNext}>
            次へ（RISCIへ進む）
          </button>
        </div>

        <small className="muted">
          ※ この回答は以降のフィードバック分岐（体験的/行動的プロセス、自己効力感の出し分け等）に用います。
        </small>
      </div>
    </div>
  );
}
