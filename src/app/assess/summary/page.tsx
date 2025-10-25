'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useAssessment } from '@/components/AssessmentStore';
import { calculateScores } from '@/lib/assessment';

const format = (value: number) => value.toString().padStart(2, '0');

export default function SummaryPage() {
  const { data, reset } = useAssessment();
  const scores = useMemo(() => calculateScores(data), [data]);

  const rows = [
    { label: 'RISCI ストレス', value: scores.risci.stress, range: '3〜15' },
    { label: 'RISCI コーピング', value: scores.risci.coping, range: '3〜15' },
    { label: 'SMA 計画', value: scores.sma.planning, range: '2〜10' },
    { label: 'SMA リフレーミング', value: scores.sma.reframing, range: '2〜10' },
    { label: 'SMA 健康的な活動', value: scores.sma.healthy, range: '2〜10' },
    { label: 'PSSM 自己効力感', value: scores.pssm, range: '5〜25' },
    { label: 'PDSM 利得', value: scores.pdsm.pros, range: '3〜15' },
    { label: 'PDSM 損失', value: scores.pdsm.cons, range: '3〜15' },
    { label: 'PPSM 体験的・認知的', value: scores.ppsm.experiential, range: '5〜25' },
    { label: 'PPSM 行動的', value: scores.ppsm.behavioral, range: '5〜25' },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">集計結果</h2>
        <p className="text-sm text-gray-400">5つの質問紙の合計点を確認し、必要であれば戻って回答を調整してください。</p>
      </header>
      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0e1330] text-left text-xs uppercase tracking-wide text-gray-400">
              <th className="px-4 py-3">尺度</th>
              <th className="px-4 py-3">合計点</th>
              <th className="px-4 py-3">理論範囲</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-[#1f2549]">
                <td className="px-4 py-3 font-medium">{row.label}</td>
                <td className="px-4 py-3 text-lg font-semibold">{format(row.value)}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{row.range}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <Link className="btn" href="/assess/feedback">
          次へ（フィードバック）
        </Link>
        <Link className="btn" href="/assess/ppsm">
          戻る
        </Link>
        <button
          type="button"
          className="rounded-lg border border-[#2a315a] bg-[#0e1330] px-4 py-2 text-sm font-semibold text-white transition hover:border-blue-400/60"
          onClick={reset}
        >
          回答をリセット
        </button>
      </div>
    </div>
  );
}
