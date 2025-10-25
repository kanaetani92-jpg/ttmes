'use client';
import { ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import { useRouter } from 'next/navigation';

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, user=>{
      if (!user) router.replace('/login'); else setReady(true);
    });
    return ()=>unsub();
  },[router]);
  if (!ready) return <div className="card p-6">読み込み中…</div>;
  return <>{children}</>;
}
