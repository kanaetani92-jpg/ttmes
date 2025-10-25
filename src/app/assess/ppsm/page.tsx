'use client';

import Link from 'next/link';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';

const EXP = [
  '健康的なやり方について情報を求めた',
  '話し合える雰囲気に気づいた',
  'ストレスによる問題を身をもって感じた',
  '健康的に対処できたとき自分を好ましく感じた',
  '自分のストレスが周囲へ与える影響を考えた',
];
const BEH = [
  '健康的に対処することを自分に誓った',
  'ストレスを感じたとき健康的な活動に切り替えた',
  '対処についてコメントしてくれる人がいた',
  '準備や予定を立てた',
  'できたときにごほうびを用意した',
];

export default function PpsmPage() {
  const { data, setLikert } = useAssessment();
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">PPSM（変容プロセス：高次2因子）</h2>
        <p className="text-sm text-gray-400">対象期間：<b>最近30日以内（今日を含む）</b>（その間の頻度）</p>
      </header>
      <section className="card space-y-5 p-6">
        <div className="space-y-4">
          <h3 className="font-semibold">体験的・認知的プロセス</h3>
          {EXP.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5 value={data.ppsm.experiential[index]} onChange={(v) => setLikert('ppsm.experiential', index, v)} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">行動的プロセス</h3>
          {BEH.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5 value={data.ppsm.behavioral[index]} onChange={(v) => setLikert('ppsm.behavioral', index, v)} />
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        <Link className="btn" href="/assess/feedback">
          次へ（フィードバック）
        </Link>
        <Link className="btn" href="/assess/pdsm">
          戻る
        </Link>
      </div>
    </div>
  );
}
