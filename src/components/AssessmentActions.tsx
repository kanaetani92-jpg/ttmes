'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { useAssessment } from './AssessmentStore';
import { getFirebaseAuth } from '@/lib/firebaseClient';

type RestartAssessmentButtonProps = {
  className?: string;
  onRestart?: () => void;
};

export function RestartAssessmentButton({ className, onRestart }: RestartAssessmentButtonProps) {
  const router = useRouter();
  const { reset } = useAssessment();

  function handleRestart() {
    onRestart?.();
    reset();
    const timestamp = Date.now();
    router.push(`/assess/stage?restart=${timestamp}`);
  }

  return (
    <button type="button" className={className ? `btn ${className}` : 'btn'} onClick={handleRestart}>
      はじめから回答する
    </button>
  );
}

export function AssessmentActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isFeedbackPage = pathname === '/assess/feedback';

  if (isFeedbackPage) {
    return null;
  }

  async function handleLogout() {
    setActionError(null);
    setLoggingOut(true);
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Failed to sign out', error);
      setActionError('ログアウトに失敗しました。もう一度お試しください。');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2">
        <RestartAssessmentButton onRestart={() => setActionError(null)} />
        <Link className="btn" href="/assess/history#assessment-history">
          過去の回答
        </Link>
        <button type="button" className="btn" onClick={handleLogout} disabled={loggingOut}>
          {loggingOut ? 'ログアウト中…' : 'ログアウト'}
        </button>
      </div>
      {actionError ? <p className="text-right text-sm text-red-300">{actionError}</p> : null}
    </div>
  );
}
