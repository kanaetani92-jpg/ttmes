'use client';

import { useEffect, useMemo, useState } from 'react';
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

type ScoreItem = { label: string; value?: number };

const ScoreSection = ({ title, items }: { title: string; items: ScoreItem[] }) => {
  const hasAnyScore = items.some((item) => typeof item.value === 'number');

  return (
    <section className="space-y-2 rounded-lg border border-[#1f2549] bg-[#11163a] p-3">
      <h4 className="text-xs font-semibold text-gray-300">{title}</h4>
      {hasAnyScore ? (
        <dl className="grid gap-2 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.label}
              className="space-y-1 rounded-md border border-[#1f2549] bg-[#0b102b] p-3"
            >
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                {item.label}
              </dt>
              <dd className="text-sm font-semibold text-gray-100">
                {typeof item.value === 'number' ? `${item.value} 点` : '不明'}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[11px] text-gray-400">保存された得点がありません。</p>
      )}
    </section>
  );
};

const AssessmentCard = ({ item }: { item: AssessmentHistory }) => {
  const stage = item.scores?.stage ?? null;
  const stageLabel = stage ? STAGE_LABELS[stage] : '不明';

  const risciScores: ScoreItem[] = [
    { label: 'ストレス（RISCI）', value: item.scores?.risci?.stress },
    { label: 'コーピング（RISCI）', value: item.scores?.risci?.coping },
  ];

  const smaScores: ScoreItem[] = [
    { label: '計画（SMA）', value: item.scores?.sma?.planning },
    { label: 'リフレーミング（SMA）', value: item.scores?.sma?.reframing },
    { label: '健康的な活動（SMA）', value: item.scores?.sma?.healthy_activity },
  ];

  const pdsmScores: ScoreItem[] = [
    { label: '利得（PDSM）', value: item.scores?.pdsm?.pros },
    { label: '損失（PDSM）', value: item.scores?.pdsm?.cons },
  ];

  const ppsmScores: ScoreItem[] = [
    { label: '体験的・認知的プロセス（PPSM）', value: item.scores?.ppsm?.experiential },
    { label: '行動的プロセス（PPSM）', value: item.scores?.ppsm?.behavioral },
  ];

  const pssmScores: ScoreItem[] = [{
    label: '自己効力感（PSSM）',
    value: item.scores?.pssm?.self_efficacy,
  }];

  return (
    <article className="space-y-3 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs text-gray-400">{formatDate(item.createdAt)}</div>
        <div className="text-sm font-semibold">ステージ：{stageLabel}</div>
      </header>
      <div className="space-y-3">
        <ScoreSection title="RISCI（ストレス／コーピング）" items={risciScores} />
        <ScoreSection title="SMA（ストレスマネジメント活動）" items={smaScores} />
        <ScoreSection title="PSSM（自己効力感）" items={pssmScores} />
        <ScoreSection title="PDSM（意思決定バランス）" items={pdsmScores} />
        <ScoreSection title="PPSM（変容プロセス：高次2因子）" items={ppsmScores} />
      </div>
      <p className="text-[11px] leading-relaxed text-gray-500">
        ※ 各スコアは回答内容から算出した合計得点です。値が「不明」と表示される場合は、当時の保存データに該当項目が含まれていません。
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
  const rowsWithBand = processRows.filter((row) => !!row.band);
  const hasAnyBand = rowsWithBand.length > 0;
  return (
    <article className="space-y-3 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs text-gray-400">{formatDate(item.createdAt)}</div>
        <div className="text-sm font-semibold">ステージ：{stageLabel}</div>
      </header>
      {hasAnyBand ? (
        <div className="space-y-2 rounded-lg border border-[#1f2549] bg-[#11163a] p-3">
          <h4 className="text-xs font-semibold text-gray-300">プロセスの評価</h4>
          <div className="space-y-2">
            {rowsWithBand.map((row) => {
              const bandLabel = getProcessBandLabel(row.band);
              return (
                <div key={row.key} className="space-y-0.5 text-xs text-gray-300">
                  <p className="font-semibold text-gray-400">{row.label}</p>
                  <p>{bandLabel ? `評価：${bandLabel}` : '評価：不明'}</p>
                </div>
              );
            })}
          </div>
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
  const [selectedHistoryId, setSelectedHistoryId] = useState('');

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

  const historyItems = useMemo(() => {
    const length = Math.max(assessments.length, prescriptions.length);
    return Array.from({ length }).map((_, index) => {
      const assessment = assessments[index] ?? null;
      const prescription = prescriptions[index] ?? null;
      const createdAt = assessment?.createdAt ?? prescription?.createdAt ?? null;
      const stage = assessment?.scores?.stage ?? prescription?.scores?.stage ?? null;
      const stageLabel = stage ? STAGE_LABELS[stage] : '不明';
      const id = assessment?.id ?? prescription?.id ?? `history-${index}`;
      return {
        id,
        assessment,
        prescription,
        createdAt,
        stageLabel,
        index,
      };
    });
  }, [assessments, prescriptions]);

  useEffect(() => {
    if (historyItems.length === 0) {
      setSelectedHistoryId('');
      return;
    }
    setSelectedHistoryId((prev) => {
      if (prev && historyItems.some((item) => item.id === prev)) {
        return prev;
      }
      return historyItems[0]?.id ?? '';
    });
  }, [historyItems]);

  const selectedHistoryItem = historyItems.find((item) => item.id === selectedHistoryId) ?? null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">過去の回答とフィードバック</h2>
        <p className="text-sm text-gray-400">
          これまでに保存された回答とフィードバックを一覧できます。最新のものから表示します。
        </p>
      </header>

      {error && <p className="rounded-lg border border-red-800/60 bg-red-900/20 p-3 text-sm text-red-200">{error}</p>}

      <section id="history" className="card space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">回答履歴とフィードバック</h3>
          {loading && <span className="text-xs text-gray-400">読み込み中…</span>}
        </div>
        {!loading && historyItems.length === 0 ? (
          <p className="text-sm text-gray-300">保存された回答やフィードバックはまだありません。</p>
        ) : null}
        {historyItems.length > 0 ? (
          <div className="space-y-6">
            <div className="space-y-2 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
              <label className="text-xs font-semibold text-gray-400" htmlFor="history-select">
                表示する履歴を選択
              </label>
              <select
                id="history-select"
                className="w-full rounded-lg border border-[#2a315a] bg-[#0b102b] px-3 py-2 text-sm text-white"
                value={selectedHistoryId}
                onChange={(event) => setSelectedHistoryId(event.target.value)}
              >
                {historyItems.map((item) => {
                  const prefix = item.index === 0 ? '最新：' : '';
                  return (
                    <option key={item.id} value={item.id}>
                      {prefix}
                      {formatDate(item.createdAt)} ／ ステージ：{item.stageLabel}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-gray-500">選択した回答履歴とフィードバックが下に表示されます。</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-300">回答内容</h4>
                {selectedHistoryItem?.assessment ? (
                  <AssessmentCard item={selectedHistoryItem.assessment} />
                ) : (
                  <p className="text-xs text-gray-400">この履歴には回答データが見つかりませんでした。</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-300">フィードバック</h4>
                {selectedHistoryItem?.prescription ? (
                  <PrescriptionCard item={selectedHistoryItem.prescription} />
                ) : (
                  <p className="text-xs text-gray-400">この履歴にはフィードバックが保存されていません。</p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
