'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';
import type { Likert5 as Likert5Value } from '@/lib/assessment';

const QUESTIONS = [
  '自分の望み通りにならなかったとき',
  '落ち込んでいるとき',
  '人との関わりの中で問題があるとき',
  '友達や家族から、嫌な思いをさせられているとき',
  '仕事や勉強の負担が多いと感じるとき',
];
const PSSM_CHOICES = [
  '1. まったくやれる自信がない',
  '2. あまりやれる自信がない',
  '3. すこしやれる自信がある',
  '4. かなりやれる自信がある',
  '5. かならずやれる自信がある',
];

export default function PssmPage() {
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
    return data.pssm.some((value) => value === null);
  }, [data.pssm, reviewMode]);

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

    router.push(`/assess/pdsm${reviewQuery}`);
  };

  const handleChange = (index: number) => (value: Likert5Value) => {
    setLikert('pssm', index, value);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">PSSM（自己効力感）</h2>
        <p className="text-sm text-gray-400">対象期間：<b>指定なし</b>（各状況でも実施できる自信の程度）</p>
      </header>
      <section className="card space-y-4 p-6">
        {QUESTIONS.map((question, index) => (
          <div key={question} className="grid items-start gap-3 md:grid-cols-2">
            <p className="text-sm leading-relaxed">{question}</p>
            <Likert5
              value={data.pssm[index]}
              onChange={handleChange(index)}
              disabled={reviewMode}
              labels={PSSM_CHOICES}
            />
          </div>
        ))}
      </section>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="btn" href={`/assess/sma${reviewQuery}`}>
          戻る
        </Link>
        <button type="button" className="btn" onClick={handleNext}>
          次へ（PDSM）
        </button>
      </div>
    </div>
  );
}
