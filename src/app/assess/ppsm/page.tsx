'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';

const BEH = [
  'ストレスを感じ始めたときは、リラックスするために休憩をとった',
  'ストレスを感じたとき、何か楽しみが持てるようなこと（例えば、好きなTV番組を録画するなど）を日頃から用意しておいた',
  '自分へのストレスが他の人にどのような影響を与えているのか、しっかり考えた',
  '私がストレスをどのようにコントロールしているかについて、コメントしてくれる人が少なくともひとりはいた',
];
const EXP = [
  'ストレスを感じた時にもっと肯定的に考えることを思い出させるものを持っていた',
  'ストレスマネジメントのやり方を自由に話し合える雰囲気になっていることに気づいた',
  'ストレスを感じ始めたとき、楽しめる健康的な活動に切りかえた',
  'ストレスによる問題をひどく身をもって感じた',
];

export default function PpsmPage() {
  const searchParams = useSearchParams();
  const reviewMode = searchParams.get('review') === '1';
  const reviewQuery = reviewMode ? '?review=1' : '';
  const { data, setLikert } = useAssessment();
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">PPSM（変容プロセス；8項目版）</h2>
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
