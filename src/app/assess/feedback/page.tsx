'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { getIdToken } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAssessment, buildAssessmentRequest } from '@/components/AssessmentStore';
import { STAGE_LABELS, Stage, calculateScores } from '@/lib/assessment';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebaseClient';

type PrescriptionResponse = {
  id: string;
  messages: { id: string; title: string; body: string }[];
  persisted?: boolean;
};

export default function FeedbackPage() {
  const { data, setStage } = useAssessment();
  const scores = useMemo(() => calculateScores(data), [data]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrescriptionResponse | null>(null);

  const rows = [
    { label: 'RISCI ストレス', value: scores.risci.stress },
    { label: 'RISCI コーピング', value: scores.risci.coping },
    { label: 'SMA 計画', value: scores.sma.planning },
    { label: 'SMA リフレーミング', value: scores.sma.reframing },
    { label: 'SMA 健康的な活動', value: scores.sma.healthy },
    { label: 'PSSM 自己効力感', value: scores.pssm },
    { label: 'PDSM 利得', value: scores.pdsm.pros },
    { label: 'PDSM 損失', value: scores.pdsm.cons },
    { label: 'PPSM 体験的・認知的', value: scores.ppsm.experiential },
    { label: 'PPSM 行動的', value: scores.ppsm.behavioral },
  ];

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const db = getFirebaseDb();
      const user = auth.currentUser;
      if (!user) throw new Error('ログインが必要です');
      const token = await getIdToken(user, true);
      const payload = buildAssessmentRequest(data);
      const res = await fetch('/api/prescription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as PrescriptionResponse;

      const ref = doc(db, 'users', user.uid, 'assessments', json.id);

      let finalResult: PrescriptionResponse = json;
      try {
        await setDoc(ref, { createdAt: serverTimestamp(), payload }, { merge: true });
        finalResult = { ...json, persisted: true };
      } catch (error) {
        console.error('Failed to persist assessment on client', error);
        setError('フィードバックの保存に失敗しました。もう一度お試しください。');
        finalResult = { ...json, persisted: json.persisted ?? false };
      }

      setResult(finalResult);
    } catch (e: any) {
      setError(e.message ?? 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">フィードバック生成</h2>
        <p className="text-sm text-gray-400">
          集計結果をもとに処方箋を生成します。変容ステージを選択し「フィードバックを生成」を押してください。
        </p>
      </header>
      <section className="card space-y-4 p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold">変容ステージ</label>
          <select
            className="input"
            value={data.stage}
            onChange={(event) => setStage(event.target.value as Stage)}
          >
            {Object.entries(STAGE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <hr className="border-[#1f2549]" />
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between rounded-lg border border-[#1f2549] bg-[#0e1330] px-4 py-3">
              <span className="text-xs font-semibold text-gray-400">{row.label}</span>
              <span className="text-lg font-bold">{row.value}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" onClick={submit} disabled={loading}>
          {loading ? '生成中…' : 'フィードバックを生成'}
        </button>
        <Link className="btn" href="/assess/summary">
          集計へ戻る
        </Link>
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      {result && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold">個別フィードバック</h3>
          {result.persisted === false && (
            <p className="rounded-lg border border-yellow-600/50 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              フィードバックは生成されましたが、サーバーへの保存に失敗しました。Firebase の管理者権限と環境変数を確認してください。
            </p>
          )}
          {result.messages.map((message) => (
            <article key={message.id} className="space-y-1 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{message.id}</p>
              <h4 className="font-semibold">{message.title}</h4>
              <p className="text-sm leading-relaxed text-gray-100">{message.body}</p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
