import { AuthGate } from '@/components/AuthGate';
import { WorkChat } from '@/components/WorkChat';

export default function WorkPage() {
  return (
    <AuthGate>
      <div className="mx-auto max-w-4xl space-y-6 py-10">
        <WorkChat />
      </div>
    </AuthGate>
  );
}
