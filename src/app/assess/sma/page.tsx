'use client';

import Link from 'next/link';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';

const PLAN = ['実行する日時を決めていた', '事前準備（道具や場所）を整えていた'];
const REFRAME = ['うまくいかない時に見方を切り替えた', 'できている面を意識できた'];
const HEALTHY = ['睡眠・休息を確保した', '軽い運動やストレッチをした'];

export default function SmaPage() {
  const { data, setLikert } = useAssessment();
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">SMA（ストレスマネジメント活動）</h2>
        <p className="text-sm text-gray-400">対象期間：<b>最近1か月間</b>（該当の活動をどれくらい行ったか）</p>
      </header>
      <section className="card space-y-5 p-6">
        <div className="space-y-4">
          <h3 className="font-semibold">計画</h3>
          {PLAN.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5 value={data.sma.planning[index]} onChange={(v) => setLikert('sma.planning', index, v)} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">リフレーミング</h3>
          {REFRAME.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5 value={data.sma.reframing[index]} onChange={(v) => setLikert('sma.reframing', index, v)} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">健康的な活動</h3>
          {HEALTHY.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5 value={data.sma.healthy[index]} onChange={(v) => setLikert('sma.healthy', index, v)} />
            </div>
          ))}
        </div>
      </section>
      <div className="flex gap-2">
        <Link className="btn" href="/assess/pssm">
          次へ（PSSM）
        </Link>
        <Link className="btn" href="/assess/risci">
          戻る
        </Link>
      </div>
    </div>
  );
}
