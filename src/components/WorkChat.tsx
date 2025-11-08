'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Auth } from 'firebase/auth';
import { addDoc, collection, doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebaseClient';
import { useAssessment } from './AssessmentStore';
import { DEFAULT_STAGE, getStageMetadata } from '@/lib/workChat';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const createMessageId = () => crypto.randomUUID();
const MAX_MESSAGE_LENGTH = 5000;

type SessionInfo = {
  userId: string;
  sessionId: string;
};

export function WorkChat() {
  const { data: assessmentData, hasHydrated: hasAssessmentHydrated } = useAssessment();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const authRef = useRef<Auth | null>(null);
  const dbRef = useRef<Firestore | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const sessionPromiseRef = useRef<Promise<SessionInfo> | null>(null);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  useEffect(() => {
    try {
      authRef.current = getFirebaseAuth();
      dbRef.current = getFirebaseDb();
    } catch (firebaseError) {
      console.error('Failed to initialize Firebase for work chat', firebaseError);
      setError((prev) => prev ?? 'Firebaseの初期化に失敗しました。ページを再読み込みしてください。');
    }
  }, []);

  const stageId = useMemo(() => {
    if (!hasAssessmentHydrated) {
      return DEFAULT_STAGE;
    }
    return assessmentData.stage ?? DEFAULT_STAGE;
  }, [assessmentData.stage, hasAssessmentHydrated]);

  const stageMetadata = useMemo(() => getStageMetadata(stageId), [stageId]);

  const trimmedInput = useMemo(() => input.trim(), [input]);
  const canSend = trimmedInput.length > 0 && !loading;
  const remaining = MAX_MESSAGE_LENGTH - input.length;

  const ensureSession = useCallback(async (): Promise<SessionInfo> => {
    if (sessionRef.current) {
      return sessionRef.current;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    const createSession = async () => {
      const auth = authRef.current ?? getFirebaseAuth();
      authRef.current = auth;
      const db = dbRef.current ?? getFirebaseDb();
      dbRef.current = db;
      const user = auth.currentUser;
      if (!user) {
        throw new Error('ログイン情報が取得できませんでした。再度ログインしなおしてください。');
      }

      const sessionsCollection = collection(db, 'users', user.uid, 'workSessions');
      const docRef = await addDoc(sessionsCollection, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        assessmentSnapshot: null,
      });

      const info: SessionInfo = { userId: user.uid, sessionId: docRef.id };
      sessionRef.current = info;
      return info;
    };

    sessionPromiseRef.current = createSession().finally(() => {
      sessionPromiseRef.current = null;
    });

    return sessionPromiseRef.current;
  }, []);

  const persistChatMessage = useCallback(
    async (message: ChatMessage) => {
      try {
        const session = await ensureSession();
        const db = dbRef.current ?? getFirebaseDb();
        dbRef.current = db;
        const messagesCollection = collection(
          db,
          'users',
          session.userId,
          'workSessions',
          session.sessionId,
          'messages',
        );
        const payload: Record<string, unknown> = {
          role: message.role,
          content: message.content,
          createdAt: serverTimestamp(),
        };
        await addDoc(messagesCollection, payload);
        const sessionDoc = doc(db, 'users', session.userId, 'workSessions', session.sessionId);
        await setDoc(
          sessionDoc,
          {
            updatedAt: serverTimestamp(),
            lastMessageRole: message.role,
          },
          { merge: true },
        );
      } catch (firebaseError) {
        console.error('Failed to persist work chat message', firebaseError);
      }
    },
    [ensureSession],
  );

  const appendMessage = useCallback(
    (message: ChatMessage, options: { persist?: boolean } = {}) => {
      const { persist = true } = options;
      setMessages((prev) => [...prev, message]);
      if (persist) {
        void persistChatMessage(message);
      }
    },
    [persistChatMessage],
  );

  const sendMessage = async (rawInput: string) => {
    if (loading) return;

    const content = rawInput.trim();
    if (!content) return;

    const userMessage: ChatMessage = { id: createMessageId(), role: 'user', content };
    const nextMessages = [...messages, userMessage];
    appendMessage(userMessage, { persist: false });
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/workchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: stageId,
          messages: nextMessages.map(({ role, content: body }) => ({ role, content: body })),
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'チャットの呼び出しに失敗しました。');
      }

      const json = (await res.json()) as {
        reply: string;
      };
      await persistChatMessage(userMessage);
      appendMessage({
        id: createMessageId(),
        role: 'assistant',
        content: json.reply,
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'チャットの呼び出しに失敗しました。');
      setMessages((prev) => prev.slice(0, -1));
      setInput(rawInput);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;
    await sendMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        void sendMessage(input);
      }
    }
  };

  const handleChoiceSelect = (choice: string) => {
    if (loading) return;
    void sendMessage(choice);
  };

  return (
    <section className="card flex h-[min(80vh,600px)] flex-col space-y-4 p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">ワーク（試験運用）</h2>
        </div>
        <Link href="/" className="btn-secondary whitespace-nowrap text-xs sm:text-sm">
          トップに戻る
        </Link>
      </header>
      <div className="space-y-3 rounded-3xl border border-white/10 bg-[#0f1632]/90 p-4 shadow-inner">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">
              現在のステージ
            </div>
            <div className="text-lg font-semibold text-white">{stageMetadata.stageName}</div>
          </div>
          <Link href="/assess/stage" className="btn-secondary whitespace-nowrap text-xs sm:text-sm">
            ステージを変更
          </Link>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-200">
          {stageMetadata.description}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          {stageMetadata.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/10 disabled:opacity-60"
              onClick={() => handleChoiceSelect(choice)}
              disabled={loading}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-[#0b1026]/90 p-4 shadow-inner"
      >
        <div className="flex min-h-full flex-col justify-end gap-3">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-gray-400">
              まだメッセージがありません。最初のメッセージを送ってみましょう。
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={clsx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={clsx(
                    'max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/20',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                      : 'bg-[#151b39]/90 text-gray-100 backdrop-blur',
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        <div className="flex items-end gap-3 rounded-3xl border border-white/10 bg-[#101836]/90 p-3 shadow-lg shadow-black/20">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={4}
            className="min-h-[96px] flex-1 resize-none border-none bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
            placeholder="メッセージを入力"
          />
          <button type="submit" className="btn whitespace-nowrap" disabled={!canSend}>
            {loading ? '送信中…' : '送信'}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>残り文字数: {Math.max(0, remaining)}</span>
          <span>Shift+Enterで改行 / Enterで送信</span>
        </div>
      </form>
    </section>
  );
}
