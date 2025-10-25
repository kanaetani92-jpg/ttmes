import Link from 'next/link';
import { AuthGate } from '@/components/AuthGate';
import { AssessmentProvider } from '@/components/AssessmentStore';
import { AssessmentActions } from '@/components/AssessmentActions';

export default function HomePage() {
  return (
    <AuthGate>
      <AssessmentProvider>
        <div className="container mx-auto max-w-4xl space-y-6 py-10">
          <AssessmentActions />
          <section className="card space-y-4 p-6">
            <h1 className="text-2xl font-bold">オンライン質問紙</h1>
            <p className="text-sm text-gray-300">
              5つの質問紙に順番に回答し、集計結果を確認したうえでフィードバックを生成できます。途中でページを移動しても回答は端末に保存されます。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link className="btn" href="/assess/stage">
                回答をはじめる
              </Link>
            </div>
          </section>
        </div>
      </AssessmentProvider>
    </AuthGate>
  );
}
