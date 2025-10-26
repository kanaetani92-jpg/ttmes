'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';

const PLAN = ['早め早めにやるべきことを片付けた', '計画的に自分の時間を使った'];
const REFRAME = ['うまくいかないような場面でも、努めて楽しくした', '仕事が続いた後は、自分にご褒美をあげた'];
const HEALTHY = ['いつもより身体を動かすことをひかえめにした', '負担がかかる定期的な運動をさぼった'];
const SMA_CHOICES = [
  '1. 決してなかった',
  '2. あまりなかった',
  '3. ときどきあった',
  '4. よくあった',
  '5. 非常によくあった',
];

export default function SmaPage() {
  const searchParams = useSearchParams();
  const reviewMode = searchParams.get('review') === '1';
  const reviewQuery = reviewMode ? '?review=1' : '';
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
              <Likert5
                value={data.sma.planning[index]}
                onChange={(v) => setLikert('sma.planning', index, v)}
                disabled={reviewMode}
                labels={SMA_CHOICES}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">リフレーミング</h3>
          {REFRAME.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.sma.reframing[index]}
                onChange={(v) => setLikert('sma.reframing', index, v)}
                disabled={reviewMode}
                labels={SMA_CHOICES}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">健康的な活動</h3>
          {HEALTHY.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.sma.healthy[index]}
                onChange={(v) => setLikert('sma.healthy', index, v)}
                disabled={reviewMode}
                labels={SMA_CHOICES}
              />
            </div>
          ))}
        </div>
      </section>
      <div className="flex gap-2">
        <Link className="btn" href={`/assess/pssm${reviewQuery}`}>
          次へ（PSSM）
        </Link>
        <Link className="btn" href={`/assess/risci${reviewQuery}`}>
          戻る
        </Link>
      </div>
    </div>
  );
}
