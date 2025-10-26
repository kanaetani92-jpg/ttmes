'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getIdToken } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { RestartAssessmentButton } from '@/components/AssessmentActions';
import { useAssessment, buildAssessmentRequest } from '@/components/AssessmentStore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebaseClient';
import { PROCESS_LABELS, getProcessBandLabel } from '@/lib/processBands';
import { HIDDEN_MESSAGE_IDS } from '@/lib/hiddenMessageIds';

type PrescriptionResponse = {
  id: string;
  messages: { id: string; title: string; body: string }[];
  scores?: ReturnType<typeof buildAssessmentRequest>['scores'];
  persisted?: boolean;
  bands?: {
    PPSM?: {
      experiential?: string;
      behavioral?: string;
    };
  };
};

export default function FeedbackPage() {
  const searchParams = useSearchParams();
  const reviewMode = searchParams.get('review') === '1';
  const { data, hasHydrated } = useAssessment();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrescriptionResponse | null>(null);

  const generateFeedback = useCallback(async () => {
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
    const sanitizedMessages = (json.messages ?? []).filter((message) => !HIDDEN_MESSAGE_IDS.has(message.id));

    const ref = doc(db, 'users', user.uid, 'assessments', json.id);

    let finalResult: PrescriptionResponse = { ...json, messages: sanitizedMessages };
    let persistenceError: string | undefined;
    try {
      await setDoc(ref, { createdAt: serverTimestamp(), payload }, { merge: true });
      const prescriptionRef = doc(db, 'users', user.uid, 'prescriptions', json.id);
      await setDoc(
        prescriptionRef,
        {
          createdAt: serverTimestamp(),
          scores: json.scores ?? payload.scores,
          messages: sanitizedMessages,
        },
        { merge: true },
      );
      finalResult = { ...json, messages: sanitizedMessages, persisted: true };
    } catch (error) {
      console.error('Failed to persist assessment on client', error);
      persistenceError = 'フィードバックの保存に失敗しました。もう一度お試しください。';
      finalResult = { ...json, messages: sanitizedMessages, persisted: json.persisted ?? false };
    }

    return { result: finalResult, persistenceError };
  }, [data]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { result: nextResult, persistenceError } = await generateFeedback();
        if (cancelled) {
          return;
        }
        setResult(nextResult);
        setError(persistenceError ?? null);
      } catch (e: any) {
        if (cancelled) {
          return;
        }
        setError(e?.message ?? 'エラーが発生しました');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [generateFeedback, hasHydrated]);

  if (!hasHydrated) {
    return <div className="space-y-6" />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">フィードバック生成</h2>
      </header>
      {reviewMode ? (
        <p className="text-xs leading-relaxed text-gray-400">
          回答内容は閲覧のみ可能です。値を変更することはできません。
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-gray-400">フィードバックを生成しています…</p>
      ) : null}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {result && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold">個別フィードバック</h3>
          {result.persisted === false && (
            <p className="rounded-lg border border-yellow-600/50 bg-yellow-500/10 p-3 text-sm text-yellow-200">
              フィードバックは生成されましたが、サーバーへの保存に失敗しました。Firebase の管理者権限と環境変数を確認してください。
            </p>
          )}
          <div className="space-y-3">
            <div className="space-y-2 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
              <h4 className="text-sm font-semibold text-gray-200">プロセスの評価</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {(
                  [
                    {
                      key: 'experiential' as const,
                      label: PROCESS_LABELS.experiential,
                      band: result.bands?.PPSM?.experiential,
                    },
                    {
                      key: 'behavioral' as const,
                      label: PROCESS_LABELS.behavioral,
                      band: result.bands?.PPSM?.behavioral,
                    },
                  ]
                ).map((item) => {
                  const bandLabel = getProcessBandLabel(item.band);
                  return (
                    <div
                      key={item.key}
                      className="space-y-1 rounded-lg border border-[#1f2549] bg-[#11163a] p-3"
                    >
                      <p className="text-xs font-semibold text-gray-400">{item.label}</p>
                      <div className="text-sm text-gray-300">
                        {bandLabel ? `評価：${bandLabel}` : '評価：不明'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {result.messages.map((message) => (
              <article key={message.id} className="space-y-1 rounded-xl border border-[#1f2549] bg-[#0e1330] p-4">
                <h4 className="font-semibold">{message.title}</h4>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-100">{message.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="flex justify-end pt-4">
        <RestartAssessmentButton />
      </div>
    </div>
  );
}
