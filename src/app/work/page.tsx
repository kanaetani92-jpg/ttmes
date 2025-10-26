import { AuthGate } from '@/components/AuthGate';
import { AssessmentProvider } from '@/components/AssessmentStore';
import { WorkChat } from '@/components/WorkChat';

export default function WorkPage() {
  return (
    <AuthGate>
      <AssessmentProvider>
        <div className="mx-auto max-w-4xl space-y-6 py-10">
          <WorkChat />
        </div>
      </AssessmentProvider>
    </AuthGate>
  );
}
