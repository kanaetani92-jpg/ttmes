'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';
import type { Likert5 as Likert5Value } from '@/lib/assessment';

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
  const router = useRouter();
  const { data, setLikert } = useAssessment();
  const [error, setError] = useState<string | null>(null);

  const hasUnanswered = useMemo(() => {
    if (reviewMode) {
      return false;
    }
    return [data.sma.planning, data.sma.reframing, data.sma.healthy].some((group) =>
      group.some((value) => value === null),
    );
  }, [data.sma.healthy, data.sma.planning, data.sma.reframing, reviewMode]);

  useEffect(() => {
    if (!error) {
      return;
    }
    if (!hasUnanswered) {
      setError(null);
    }
  }, [error, hasUnanswered]);

  const handleNext = () => {
    if (hasUnanswered) {
      setError('未回答の項目があります。すべての質問に回答してください。');
      return;
    }

    router.push(`/assess/pssm${reviewQuery}`);
  };

  const handleChange = (path: string, index: number) => (value: Likert5Value) => {
    setLikert(path, index, value);
    setError(null);
  };

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
            <div key={question} className="grid items-start gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.sma.planning[index]}
                onChange={handleChange('sma.planning', index)}
                disabled={reviewMode}
                labels={SMA_CHOICES}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">リフレーミング</h3>
          {REFRAME.map((question, index) => (
            <div key={question} className="grid items-start gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.sma.reframing[index]}
                onChange={handleChange('sma.reframing', index)}
                disabled={reviewMode}
                labels={SMA_CHOICES}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">健康的な活動</h3>
          {HEALTHY.map((question, index) => (
            <div key={question} className="grid items-start gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.sma.healthy[index]}
                onChange={handleChange('sma.healthy', index)}
                disabled={reviewMode}
                labels={SMA_CHOICES}
              />
            </div>
          ))}
        </div>
      </section>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="btn" href={`/assess/risci${reviewQuery}`}>
          戻る
        </Link>
        <button type="button" className="btn" onClick={handleNext}>
          次へ（PSSM）
        </button>
      </div>
    </div>
  );
}
