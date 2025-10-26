'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAssessment } from '@/components/AssessmentStore';
import { Likert5 } from '@/components/forms/Likert5';

const STRESS = [
  'いつもより負担がかかっていると感じた',
  'いろいろなことで気持ちがまいった',
  'まわりからプレッシャーを感じた',
];
const COPING = [
  'トラブルをうまく解決できた',
  '思いがけない問題に直面しても対応できた',
  '大変な状況に出会っても対応できた',
];
const RISCI_CHOICES = [
  '1. 決してなかった',
  '2. あまりなかった',
  '3. ときどきあった',
  '4. よくあった',
  '5. 非常によくあった',
];

export default function RisciPage() {
  const searchParams = useSearchParams();
  const reviewMode = searchParams.get('review') === '1';
  const reviewQuery = reviewMode ? '?review=1' : '';
  const { data, setLikert } = useAssessment();
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">RISCI（ストレス／コーピング）</h2>
        <p className="text-sm text-gray-400">対象期間：<b>最近1か月</b>（直近1か月の出来事の頻度）</p>
      </header>
      <section className="card space-y-5 p-6">
        <div className="space-y-4">
          <h3 className="font-semibold">ストレス</h3>
          {STRESS.map((question, index) => (
            <div key={question} className="grid items-start gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.risci.stress[index]}
                onChange={(v) => setLikert('risci.stress', index, v)}
                disabled={reviewMode}
                labels={RISCI_CHOICES}
              />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold">コーピング</h3>
          {COPING.map((question, index) => (
            <div key={question} className="grid items-start gap-3 md:grid-cols-2">
              <p className="text-sm leading-relaxed">{question}</p>
              <Likert5
                value={data.risci.coping[index]}
                onChange={(v) => setLikert('risci.coping', index, v)}
                disabled={reviewMode}
                labels={RISCI_CHOICES}
              />
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="btn" href={`/assess/stage${reviewQuery}`}>
          戻る
        </Link>
        <Link className="btn" href={`/assess/sma${reviewQuery}`}>
          次へ（SMA）
        </Link>
      </div>
    </div>
  );
}
