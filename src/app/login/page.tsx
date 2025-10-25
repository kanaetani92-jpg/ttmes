'use client';
import { FormEvent, useState } from 'react';
import { getFirebaseAuth } from '@/lib/firebaseClient';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [isResetMode, setIsResetMode] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setAuthLoading(true);
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
      setAuthLoading(false);
    }
  }

  async function handleResetPassword(e?: FormEvent) {
    if (e) {
      e.preventDefault();
    }
    setError(null);
    setInfo(null);
    if (!email) {
      setError('パスワード再設定用のメールアドレスを入力してください。');
      return;
    }
    try {
      const auth = getFirebaseAuth();
      setResetLoading(true);
      await sendPasswordResetEmail(auth, email);
      setInfo('パスワード再設定用のメールを送信しました。メールボックスをご確認ください。');
    } catch (e: any) {
      setError(e?.message ?? 'パスワード再設定メールの送信に失敗しました。');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="card p-6">
      {isResetMode ? (
        <>
          <h2 className="text-xl font-bold mb-4">パスワード再設定</h2>
          <form onSubmit={handleResetPassword} className="space-y-3">
            <input
              className="input"
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn" disabled={resetLoading}>
              {resetLoading ? '送信中...' : '再設定メールを送信'}
            </button>
          </form>
          <button
            type="button"
            className="btn-ghost w-full mt-4"
            onClick={() => {
              setIsResetMode(false);
              setError(null);
              setInfo(null);
            }}
          >
            ログイン画面に戻る
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-4">{mode === 'login' ? 'ログイン' : '新規登録'}</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <input className="input" type="email" placeholder="メールアドレス" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input className="input" type="password" placeholder="パスワード (6文字以上)" value={password} onChange={e=>setPassword(e.target.value)} required />
            <button className="btn" disabled={authLoading}>{authLoading ? '送信中...' : (mode==='login'?'ログイン':'登録')}</button>
          </form>
          <hr className="my-4"/>
          <div className="mt-4 space-y-2">
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={()=>{
                setMode(mode==='login'?'register':'login');
                setError(null);
                setInfo(null);
              }}
            >
              {mode==='login'?'アカウントを作成':'既にアカウントをお持ちの方はこちら'}
            </button>
            {mode === 'login' && (
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => {
                  setIsResetMode(true);
                  setMode('login');
                  setError(null);
                  setInfo(null);
                }}
              >
                パスワードをお忘れの方はこちら
              </button>
            )}
          </div>
        </>
      )}
      {error && <p className="text-red-300 mt-3">{error}</p>}
      {info && <p className="text-green-300 mt-3">{info}</p>}
    </div>
  );
}
