import { AuthGate } from '@/components/AuthGate';
import { AssessmentProvider } from '@/components/AssessmentStore';
import { AssessmentActions } from '@/components/AssessmentActions';

export const metadata = { title: 'アセスメント' };

export default function AssessLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AssessmentProvider>
        <div className="container mx-auto max-w-4xl space-y-6 py-6">
          <AssessmentActions />
          {children}
        </div>
      </AssessmentProvider>
    </AuthGate>
  );
}
