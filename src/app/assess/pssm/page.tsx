'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';

const QUESTIONS = [
  '自分の思う通りにならなかったとき',
  '落ち込んでいるとき',
  '人との関わりの中で、問題を抱えているとき',
  '友達や家族から嫌な思いをさせられているとき',
  '仕事や勉強の負担が多いと感じるとき',
];

export default function PssmPage() {
  const searchParams = useSearchParams();
  const reviewMode = searchParams.get('review') === '1';
  const reviewQuery = reviewMode ? '?review=1' : '';
  const { data, setLikert } = useAssessment();
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">PSSM（自己効力感）</h2>
        <p className="text-sm text-gray-400">対象期間：<b>指定なし</b>（各状況でも実施できる自信の程度）</p>
      </header>
      <section className="card space-y-4 p-6">
        {QUESTIONS.map((question, index) => (
          <div key={question} className="grid items-center gap-3 md:grid-cols-2">
            <p className="text-sm leading-relaxed">{question}</p>
            <Likert5
              value={data.pssm[index]}
              onChange={(v) => setLikert('pssm', index, v)}
              disabled={reviewMode}
            />
          </div>
        ))}
      </section>
      <div className="flex gap-2">
        <Link className="btn" href={`/assess/pdsm${reviewQuery}`}>
          次へ（PDSM）
        </Link>
        <Link className="btn" href={`/assess/sma${reviewQuery}`}>
          戻る
        </Link>
      </div>
    </div>
  );
}
