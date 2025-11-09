'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';
import type { Likert5 as Likert5Value } from '@/lib/assessment';

const PROS = ['自分をもっと良く思える', '自分の生活をもっとコントロールできる', '人間関係がもっと良くなる'];
const CONS = ['時間が足りなくなる', '毎日の生活に支障をきたす', '費用がかかる'];
const PDSM_CHOICES = [
  '1. まったく重要でない',
  '2. あまり重要でない',
  '3. 少し重要である',
  '4. かなり重要である',
  '5. 非常に重要である',
];

export default function PdsmPage() {
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
    return [data.pdsm.pros, data.pdsm.cons].some((group) => group.some((value) => value === null));
  }, [data.pdsm.cons, data.pdsm.pros, reviewMode]);

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

    router.push(`/assess/ppsm${reviewQuery}`);
  };

  const handleChange = (path: string, index: number) => (value: Likert5Value) => {
    setLikert(path, index, value);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">PDSM（意思決定バランス）</h2>
        <p className="text-sm text-gray-400">対象期間：<b>指定なし</b>（実施に関する意見の重要度）</p>
      </header>
      <section className="card space-y-5 p-6">
        <div className="space-y-4">
          <h3 className="font-semibold">利得（Pros）</h3>
          {PROS.map((question, index) => (
            <div key={question} className="grid items-start gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.pdsm.pros[index]}
                onChange={handleChange('pdsm.pros', index)}
                disabled={reviewMode}
                labels={PDSM_CHOICES}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">損失（Cons）</h3>
          {CONS.map((question, index) => (
            <div key={question} className="grid items-start gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.pdsm.cons[index]}
                onChange={handleChange('pdsm.cons', index)}
                disabled={reviewMode}
                labels={PDSM_CHOICES}
              />
            </div>
          ))}
        </div>
      </section>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="btn" href={`/assess/pssm${reviewQuery}`}>
          戻る
        </Link>
        <button type="button" className="btn" onClick={handleNext}>
          次へ（PPSM）
        </button>
      </div>
    </div>
  );
}
