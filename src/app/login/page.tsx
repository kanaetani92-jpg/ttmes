'use client';
import { FormEvent, useState } from 'react';
import { getFirebaseAuth } from '@/lib/firebaseClient';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const auth = getFirebaseAuth();

      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-4">{mode === 'login' ? 'ログイン' : '新規登録'}</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="input" type="email" placeholder="メールアドレス" value={email} onChange={e=>setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="パスワード (6文字以上)" value={password} onChange={e=>setPassword(e.target.value)} required />
        <button className="btn" disabled={loading}>{loading ? '送信中...' : (mode==='login'?'ログイン':'登録')}</button>
      </form>
      {error && <p className="text-red-300 mt-3">{error}</p>}
      <hr className="my-4"/>
      <button className="link" onClick={()=>setMode(mode==='login'?'register':'login')}>
        {mode==='login'?'アカウントを作成':'既にアカウントをお持ちの方はこちら'}
      </button>
    </div>
  );
}
