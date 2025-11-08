import { AuthGate } from '@/components/AuthGate';
import { AssessmentProvider } from '@/components/AssessmentStore';
import { AssessmentActions, RestartAssessmentButton } from '@/components/AssessmentActions';
import { WorkLinkButton } from '@/components/WorkLinkButton';

export default function HomePage() {
  return (
    <AuthGate>
      <AssessmentProvider>
        <div className="container mx-auto max-w-4xl space-y-6 py-10">
          <AssessmentActions showRestartButton={false} showWorkLink={false} />
          <section className="card space-y-4 p-6">
            <h1 className="text-2xl font-bold">今の状態をチェック</h1>
            <p className="text-sm text-gray-300">
              5つの質問紙に順番に回答し、集計結果を確認したうえでフィードバックを生成できます。途中でページを移動しても回答は端末に保存されます。
            </p>
            <div className="flex flex-col gap-3 sm:w-fit">
              <RestartAssessmentButton className="w-full text-center sm:w-64">回答をはじめる</RestartAssessmentButton>
              <WorkLinkButton className="w-full text-center sm:w-64" />
            </div>
          </section>
        </div>
      </AssessmentProvider>
    </AuthGate>
  );
}
