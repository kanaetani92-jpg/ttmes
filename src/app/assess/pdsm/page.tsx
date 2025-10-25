'use client';

import Link from 'next/link';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';

const PROS = ['健康や気分に良い影響がある', '達成感や自己効力感が高まる', '生活リズムが整う'];
const CONS = ['時間が足りなくなる', '毎日の生活に支障をきたす', '費用がかかる'];

export default function PdsmPage() {
  const { data, setLikert } = useAssessment();
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
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5 value={data.pdsm.pros[index]} onChange={(v) => setLikert('pdsm.pros', index, v)} />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">損失（Cons）</h3>
          {CONS.map((question, index) => (
            <div key={question} className="grid items-center gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5 value={data.pdsm.cons[index]} onChange={(v) => setLikert('pdsm.cons', index, v)} />
            </div>
          ))}
        </div>
      </section>
      <div className="flex gap-2">
        <Link className="btn" href="/assess/ppsm">
          次へ（PPSM）
        </Link>
        <Link className="btn" href="/assess/pssm">
          戻る
        </Link>
      </div>
    </div>
  );
}
