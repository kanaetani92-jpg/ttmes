'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { ReactNode } from 'react';
import { useHasAssessmentHistory } from '@/hooks/useHasAssessmentHistory';

type WorkLinkButtonProps = {
  className?: string;
  children?: ReactNode;
};

export function WorkLinkButton({ className, children }: WorkLinkButtonProps) {
  const { hasHistory, loading } = useHasAssessmentHistory();

  if (loading || !hasHistory) {
    return null;
  }

  return (
    <Link href="/work" className={clsx('btn', className)}>
      {children ?? 'ワーク画面へ（試験運用）'}
    </Link>
  );
}
