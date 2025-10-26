'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';

const EXP = [
  'ストレスをコントロールする健康的なやり方についての情報を求めた',
  'ストレスマネジメントのやり方を，自由に話し合える雰囲気になっていることに気づいた',
  'ストレスによる問題をひどく身をもって感じた',
  '健康的なやり方でストレスをコントロールしたとき，自分を好ましく感じた',
  '自分へのストレスが他の人にどのような影響を与えているのかしっかり考えた',
];
const BEH = [
  'ストレスをコントロールするために積極的になることを自分に誓った',
  'ストレスを感じ始めたとき、楽しめるような健康的な活動に切りかえた',
  '私がストレスをどのようにコントロールしているかについて、コメントしてくれる人が少なくとも一人はいた',
  '健康的なやり方でストレスをコントロールできるように準備をした（予定を立てるなど）',
  '健康的なやり方でストレスをコントロールできたとき、ごほうびをもらった（自分または他人から）',
];
const PPSM_CHOICES = [
  '1. 全くなかった',
  '2. あまりなかった',
  '3. ときどきあった',
  '4. よくあった',
  '5. 非常によくあった',
];

export default function PpsmPage() {
  const searchParams = useSearchParams();
  const reviewMode = searchParams.get('review') === '1';
  const reviewQuery = reviewMode ? '?review=1' : '';
  const { data, setLikert } = useAssessment();
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">PPSM（変容プロセス；10項目版）</h2>
        <p className="text-sm text-gray-400">対象期間：<b>最近30日以内（今日を含む）</b>（その間の頻度）</p>
      </header>
      <section className="card space-y-5 p-6">
        <div className="space-y-4">
          <h3 className="font-semibold">体験的・認知的プロセス</h3>
          {EXP.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.ppsm.experiential[index]}
                onChange={(v) => setLikert('ppsm.experiential', index, v)}
                disabled={reviewMode}
                labels={PPSM_CHOICES}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">行動的プロセス</h3>
          {BEH.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.ppsm.behavioral[index]}
                onChange={(v) => setLikert('ppsm.behavioral', index, v)}
                disabled={reviewMode}
                labels={PPSM_CHOICES}
              />
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        <Link className="btn" href={`/assess/feedback${reviewQuery}`}>
          次へ（フィードバック）
        </Link>
        <Link className="btn" href={`/assess/pdsm${reviewQuery}`}>
          戻る
        </Link>
      </div>
    </div>
  );
}
