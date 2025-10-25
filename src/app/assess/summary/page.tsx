'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SummaryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/assess/feedback');
  }, [router]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">フィードバックに移動しています…</h2>
      <p className="text-sm text-gray-400">
        集計結果は自動的に処理され、フィードバック画面で確認できます。しばらくお待ちください。
      </p>
    </div>
  );
}
