import { AuthGate } from '@/components/AuthGate';
import { WorkChat } from '@/components/WorkChat';
import { AssessmentProvider } from '@/components/AssessmentStore';

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
