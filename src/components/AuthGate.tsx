'use client';
import { ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged, type Unsubscribe } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    let unsubscribe: Unsubscribe | undefined;

    try {
      const firebaseAuth = getFirebaseAuth();
      unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (!user) router.replace('/login'); else setReady(true);
      });
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error
          ? err.message
          : 'Firebase client SDK could not be initialized. Please check your environment variables.';
      setError(message);
    }

    return () => {
      unsubscribe?.();
    };
  }, [router]);
  if (error) {
    return (
      <div className="card space-y-3 p-6">
        <p className="font-semibold text-red-400">Firebaseの初期化に失敗しました。</p>
        <p className="text-sm text-gray-300">{error}</p>
        <p className="text-xs text-gray-400">
          NEXT_PUBLIC_FIREBASE_* の環境変数がデプロイ環境に設定されているか確認してください。
        </p>
      </div>
    );
  }

  if (!ready) return <div className="card p-6">読み込み中…</div>;
  return <>{children}</>;
}
