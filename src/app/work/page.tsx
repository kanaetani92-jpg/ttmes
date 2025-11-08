import { AuthGate } from '@/components/AuthGate';
import { WorkChat } from '@/components/WorkChat';
import { AssessmentProvider } from '@/components/AssessmentStore';

export default function WorkPage() {
  return (
    <AuthGate>
      <AssessmentProvider>
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
          <WorkChat />
        </div>
      </AssessmentProvider>
    </AuthGate>
  );
}
