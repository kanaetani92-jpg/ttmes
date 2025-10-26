'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { signOut } from 'firebase/auth';
import { useAssessment } from './AssessmentStore';
import { getFirebaseAuth } from '@/lib/firebaseClient';

type RestartAssessmentButtonProps = {
  className?: string;
  onRestart?: () => void;
  children?: ReactNode;
};

export function RestartAssessmentButton({ className, onRestart, children }: RestartAssessmentButtonProps) {
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
      {children ?? 'はじめから回答する'}
    </button>
  );
}

type LogoutButtonProps = {
  className?: string;
  onError?: (message: string | null) => void;
};

export function LogoutButton({ className, onError }: LogoutButtonProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    onError?.(null);
    setLoggingOut(true);
    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Failed to sign out', error);
      onError?.('ログアウトに失敗しました。もう一度お試しください。');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <button
      type="button"
      className={className ? `btn ${className}` : 'btn'}
      onClick={handleLogout}
      disabled={loggingOut}
    >
      {loggingOut ? 'ログアウト中…' : 'ログアウト'}
    </button>
  );
}

type AssessmentActionsProps = {
  showRestartButton?: boolean;
  showWorkLink?: boolean;
};

export function AssessmentActions({ showRestartButton = true, showWorkLink = true }: AssessmentActionsProps) {
  const pathname = usePathname();
  const [actionError, setActionError] = useState<string | null>(null);

  const isFeedbackPage = pathname === '/assess/feedback';

  if (isFeedbackPage) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap justify-end gap-2">
        {showWorkLink ? (
          <Link className="btn" href="/work">
            ワーク画面へ
          </Link>
        ) : null}
        {showRestartButton ? <RestartAssessmentButton onRestart={() => setActionError(null)} /> : null}
        <Link className="btn" href="/assess/history#assessment-history">
          過去の回答
        </Link>
        <LogoutButton onError={setActionError} />
      </div>
      {actionError ? <p className="text-right text-sm text-red-300">{actionError}</p> : null}
    </div>
  );
}
