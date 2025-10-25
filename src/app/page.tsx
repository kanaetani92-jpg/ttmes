import { AuthGate } from '@/components/AuthGate';
import AssessmentForm from '@/components/AssessmentForm';

export default function HomePage() {
  return (
    <AuthGate>
      <AssessmentForm />
    </AuthGate>
  );
}
