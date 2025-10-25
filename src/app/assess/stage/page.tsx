'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Stage = 'PC' | 'C' | 'PR' | 'A' | 'M';

const OPTIONS: Array<{ id: Stage; label: string; helper: string }> = [
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

export default function StagePage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 既存保存値を読み込み（任意）
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ttm-es');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.stage) setStage(parsed.stage as Stage);
      }
    } catch {}
  }, []);

  function saveAndNext() {
    if (!stage) {
      setError('ステージを選択してください。');
      return;
    }
    setError(null);

    // localStorage('ttm-es') に stage を保存（他の回答があってもマージ）
    try {
      const raw = localStorage.getItem('ttm-es');
      const data = raw ? JSON.parse(raw) : {};
      data.stage = stage;
      localStorage.setItem('ttm-es', JSON.stringify(data));
    } catch {}

    router.push('/assess/risci');
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">設問1：変容ステージ</h2>

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
              className={`flex items-start gap-3 p-3 rounded-xl border ${
                stage === opt.id ? 'border-blue-400 bg-[#13214a]' : 'border-[#2a315a] bg-[#0e1330]'
              } cursor-pointer`}
            >
              <input
                type="radio"
                name="stage"
                value={opt.id}
                checked={stage === opt.id}
                onChange={() => setStage(opt.id)}
                className="mt-1"
              />
              <div>
                <div className="font-medium">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.helper}</div>
              </div>
            </label>
          ))}
        </div>

        {error && <div className="text-red-300 text-sm">{error}</div>}

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
