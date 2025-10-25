'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebaseClient';
import { STAGE_LABELS, Stage } from '@/lib/assessment';
import { PROCESS_LABELS, getProcessBandLabel } from '@/lib/processBands';

type StoredScores = {
  stage?: Stage;
  pssm?: { self_efficacy?: number };
  pdsm?: { pros?: number; cons?: number };
  ppsm?: { experiential?: number; behavioral?: number };
  risci?: { stress?: number; coping?: number };
  sma?: { planning?: number; reframing?: number; healthy_activity?: number };
};

type AssessmentHistory = {
  id: string;
  createdAt: Date | null;
  scores: StoredScores | null;
};

type StoredBands = {
  PPSM?: {
    experiential?: string;
    behavioral?: string;
  };
};

type PrescriptionHistory = {
  id: string;
  createdAt: Date | null;
  scores: StoredScores | null;
  messages: { id: string; title: string; body: string }[];
  bands: StoredBands | null;
};

const formatDate = (input: Date | null) => {
  if (!input) return '日時不明';
  return new Date(input).toLocaleString('ja-JP');
};

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    try {
      const date = value.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
    } catch (error) {
      console.error('Failed to convert Firestore timestamp', error);
      return null;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const AssessmentCard = ({ item }: { item: AssessmentHistory }) => {
  const stageLabel = item.scores?.stage ? STAGE_LABELS[item.scores.stage] : '不明';
  return (
    <article className="space-y-2 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs text-gray-400">{formatDate(item.createdAt)}</div>
        <div className="text-sm font-semibold">ステージ：{stageLabel}</div>
      </header>
      <p className="text-xs leading-relaxed text-gray-400">
        個別の得点は履歴では表示されませんが、フィードバックは以下に保存されています。
      </p>
    </article>
  );
};

const PrescriptionCard = ({ item }: { item: PrescriptionHistory }) => {
  const stageLabel = item.scores?.stage ? STAGE_LABELS[item.scores.stage] : '不明';
  const processRows = ([
    {
      key: 'experiential' as const,
      label: PROCESS_LABELS.experiential,
      band: item.bands?.PPSM?.experiential,
    },
    {
      key: 'behavioral' as const,
      label: PROCESS_LABELS.behavioral,
      band: item.bands?.PPSM?.behavioral,
    },
  ]);
  const hasAnyBand = processRows.some((row) => !!row.band);
  return (
    <article className="space-y-3 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs text-gray-400">{formatDate(item.createdAt)}</div>
        <div className="text-sm font-semibold">ステージ：{stageLabel}</div>
      </header>
      {processRows.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-[#1f2549] bg-[#11163a] p-3">
          <h4 className="text-xs font-semibold text-gray-300">プロセスの評価</h4>
          {hasAnyBand ? (
            <div className="space-y-2">
              {processRows.map((row) => {
                const bandLabel = getProcessBandLabel(row.band);
                return (
                  <div key={row.key} className="space-y-0.5 text-xs text-gray-300">
                    <p className="font-semibold text-gray-400">{row.label}</p>
                    <p>{bandLabel ? `評価：${bandLabel}` : '評価：不明'}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400">評価情報は保存されていません。</p>
          )}
        </div>
      ) : null}
      <div className="space-y-3">
        {item.messages.length === 0 ? (
          <p className="text-xs text-gray-400">メッセージは保存されていません。</p>
        ) : (
          item.messages.map((message) => (
            <article
              key={message.id}
              className="space-y-1 rounded-lg border border-[#1f2549] bg-[#11163a] p-3"
            >
              <p className="text-[10px] uppercase tracking-wide text-gray-500">{message.id}</p>
              <h4 className="text-sm font-semibold">{message.title}</h4>
              <p className="whitespace-pre-line text-xs leading-relaxed text-gray-200">{message.body}</p>
            </article>
          ))
        )}
      </div>
    </article>
  );
};

export default function HistoryPage() {
  const [assessments, setAssessments] = useState<AssessmentHistory[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOlderAssessmentId, setSelectedOlderAssessmentId] = useState('');
  const [selectedOlderPrescriptionId, setSelectedOlderPrescriptionId] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      const errors: string[] = [];
      try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) throw new Error('ログインが必要です。');
        const db = getFirebaseDb();

        try {
          const assessmentsRef = query(
            collection(db, 'users', user.uid, 'assessments'),
            orderBy('createdAt', 'desc'),
          );
          const snapshot = await getDocs(assessmentsRef);
          if (active) {
            const items: AssessmentHistory[] = snapshot.docs.map((doc) => {
              const data = doc.data() as { createdAt?: unknown; payload?: { scores?: StoredScores } };
              return {
                id: doc.id,
                createdAt: toDate(data.createdAt ?? null),
                scores: data.payload?.scores ?? null,
              };
            });
            setAssessments(items);
          }
        } catch (err) {
          console.error('Failed to load assessments history', err);
          errors.push('過去の回答の取得に失敗しました。');
          if (active) setAssessments([]);
        }

        try {
          const prescriptionsRef = query(
            collection(db, 'users', user.uid, 'prescriptions'),
            orderBy('createdAt', 'desc'),
          );
          const snapshot = await getDocs(prescriptionsRef);
          if (active) {
            const items: PrescriptionHistory[] = snapshot.docs.map((doc) => {
              const data = doc.data() as {
                createdAt?: unknown;
                scores?: StoredScores;
                messages?: { id: string; title: string; body: string }[];
                bands?: StoredBands;
              };
              return {
                id: doc.id,
                createdAt: toDate(data.createdAt ?? null),
                scores: data.scores ?? null,
                messages: Array.isArray(data.messages) ? data.messages : [],
                bands: data.bands ?? null,
              };
            });
            setPrescriptions(items);
          }
        } catch (err) {
          console.error('Failed to load prescriptions history', err);
          errors.push('フィードバックの取得に失敗しました。');
          if (active) setPrescriptions([]);
        }
      } catch (err) {
        console.error('Failed to load history', err);
        errors.push(err instanceof Error ? err.message : '履歴の取得に失敗しました。');
      } finally {
        if (active) {
          setError(errors.length ? errors.join(' ') : null);
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const olderAssessments = assessments.slice(3);
    if (olderAssessments.length === 0) {
      setSelectedOlderAssessmentId('');
    } else {
      setSelectedOlderAssessmentId((prev) => {
        if (prev && olderAssessments.some((item) => item.id === prev)) {
          return prev;
        }
        return olderAssessments[0]?.id ?? '';
      });
    }
  }, [assessments]);

  useEffect(() => {
    const olderPrescriptions = prescriptions.slice(3);
    if (olderPrescriptions.length === 0) {
      setSelectedOlderPrescriptionId('');
    } else {
      setSelectedOlderPrescriptionId((prev) => {
        if (prev && olderPrescriptions.some((item) => item.id === prev)) {
          return prev;
        }
        return olderPrescriptions[0]?.id ?? '';
      });
    }
  }, [prescriptions]);

  const latestAssessments = assessments.slice(0, 3);
  const olderAssessments = assessments.slice(3);
  const selectedOlderAssessment = olderAssessments.find((item) => item.id === selectedOlderAssessmentId);

  const latestPrescriptions = prescriptions.slice(0, 3);
  const olderPrescriptions = prescriptions.slice(3);
  const selectedOlderPrescription = olderPrescriptions.find((item) => item.id === selectedOlderPrescriptionId);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">過去の回答とフィードバック</h2>
        <p className="text-sm text-gray-400">
          これまでに保存された回答とフィードバックを一覧できます。最新のものから表示します。
        </p>
      </header>

      {error && <p className="rounded-lg border border-red-800/60 bg-red-900/20 p-3 text-sm text-red-200">{error}</p>}

      <section id="assessment-history" className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">回答履歴</h3>
          {loading && <span className="text-xs text-gray-400">読み込み中…</span>}
        </div>
        {assessments.length === 0 && !loading ? (
          <p className="text-sm text-gray-300">保存された回答はまだありません。</p>
        ) : (
          <div className="space-y-4">
            {latestAssessments.map((item) => (
              <AssessmentCard key={item.id} item={item} />
            ))}
            {olderAssessments.length > 0 && (
              <>
                <div className="space-y-2 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
                  <label
                    className="text-xs font-semibold text-gray-400"
                    htmlFor="older-assessment-select"
                  >
                    さらに前の回答を選択
                  </label>
                  <select
                    id="older-assessment-select"
                    className="w-full rounded-lg border border-[#2a315a] bg-[#0b102b] px-3 py-2 text-sm text-white"
                    value={selectedOlderAssessmentId}
                    onChange={(event) => setSelectedOlderAssessmentId(event.target.value)}
                  >
                    {olderAssessments.map((item) => {
                      const stageLabel = item.scores?.stage ? STAGE_LABELS[item.scores.stage] : '不明';
                      return (
                        <option key={item.id} value={item.id}>
                          {formatDate(item.createdAt)} ／ ステージ：{stageLabel}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-gray-500">選択した回答の詳細が下に表示されます。</p>
                </div>
                {selectedOlderAssessment ? (
                  <AssessmentCard key={selectedOlderAssessment.id} item={selectedOlderAssessment} />
                ) : null}
              </>
            )}
          </div>
        )}
      </section>

      <section id="feedback-history" className="card space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">フィードバック履歴</h3>
          {loading && <span className="text-xs text-gray-400">読み込み中…</span>}
        </div>
        {prescriptions.length === 0 && !loading ? (
          <p className="text-sm text-gray-300">保存されたフィードバックはまだありません。</p>
        ) : (
          <div className="space-y-4">
            {latestPrescriptions.map((item) => (
              <PrescriptionCard key={item.id} item={item} />
            ))}
            {olderPrescriptions.length > 0 && (
              <>
                <div className="space-y-2 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
                  <label
                    className="text-xs font-semibold text-gray-400"
                    htmlFor="older-prescription-select"
                  >
                    さらに前のフィードバックを選択
                  </label>
                  <select
                    id="older-prescription-select"
                    className="w-full rounded-lg border border-[#2a315a] bg-[#0b102b] px-3 py-2 text-sm text-white"
                    value={selectedOlderPrescriptionId}
                    onChange={(event) => setSelectedOlderPrescriptionId(event.target.value)}
                  >
                    {olderPrescriptions.map((item) => {
                      const stageLabel = item.scores?.stage ? STAGE_LABELS[item.scores.stage] : '不明';
                      return (
                        <option key={item.id} value={item.id}>
                          {formatDate(item.createdAt)} ／ ステージ：{stageLabel}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-gray-500">選択したフィードバックの詳細が下に表示されます。</p>
                </div>
                {selectedOlderPrescription ? (
                  <PrescriptionCard key={selectedOlderPrescription.id} item={selectedOlderPrescription} />
                ) : null}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
