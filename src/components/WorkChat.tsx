'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Auth } from 'firebase/auth';
import { addDoc, collection, doc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore';
import type { StageGuide } from '@/data/stageGuides';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebaseClient';
import { useAssessment } from './AssessmentStore';
import { StageGuideMessage } from './StageGuideMessage';
import { WorkPlanMessage, type WorkPlan } from './WorkPlanMessage';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  plan?: WorkPlan;
  guide?: StageGuide;
};

type ChatContext = {
  stage?: string;
  bands?: Record<string, unknown>;
};

const createMessageId = () => crypto.randomUUID();
const MAX_MESSAGE_LENGTH = 5000;

type SessionInfo = {
  userId: string;
  sessionId: string;
};

const parseWorkPlan = (reply: string): WorkPlan | undefined => {
  try {
    const parsed = JSON.parse(reply);
    if (!parsed || typeof parsed !== 'object') {
      return undefined;
    }

    if (typeof parsed.intro !== 'string') {
      return undefined;
    }

    const today = (parsed as any).today_action;
    if (!today || typeof today !== 'object') {
      return undefined;
    }
    if (typeof today.title !== 'string' || !Array.isArray(today.steps)) {
      return undefined;
    }

    return parsed as WorkPlan;
  } catch (error) {
    return undefined;
  }
};

export function WorkChat() {
  const { data, hasHydrated } = useAssessment();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ChatContext>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const authRef = useRef<Auth | null>(null);
  const dbRef = useRef<Firestore | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const sessionPromiseRef = useRef<Promise<SessionInfo> | null>(null);
  const assessmentSnapshotRef = useRef(data);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [messages]);

  useEffect(() => {
    assessmentSnapshotRef.current = data;
  }, [data]);

  useEffect(() => {
    try {
      authRef.current = getFirebaseAuth();
      dbRef.current = getFirebaseDb();
    } catch (firebaseError) {
      console.error('Failed to initialize Firebase for work chat', firebaseError);
      setError((prev) => prev ?? 'Firebaseの初期化に失敗しました。ページを再読み込みしてください。');
    }
  }, []);

  const trimmedInput = useMemo(() => input.trim(), [input]);
  const displayedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const canSend = trimmedInput.length > 0 && !loading && hasHydrated;
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
        assessmentSnapshot: assessmentSnapshotRef.current,
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
          plan: message.plan ?? null,
          guide: message.guide ?? null,
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
    (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      void persistChatMessage(message);
    },
    [persistChatMessage],
  );

  useEffect(() => {
    if (!context.stage && !context.bands) {
      return;
    }

    const persistContext = async () => {
      try {
        const session = await ensureSession();
        const db = dbRef.current ?? getFirebaseDb();
        dbRef.current = db;
        const sessionDoc = doc(db, 'users', session.userId, 'workSessions', session.sessionId);
        await setDoc(
          sessionDoc,
          {
            contextSnapshot: context,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (firebaseError) {
        console.error('Failed to persist work chat context', firebaseError);
      }
    };

    void persistContext();
  }, [context, ensureSession]);

  const sendMessage = async (rawInput: string) => {
    if (loading || !hasHydrated) return;

    const content = rawInput.trim();
    if (!content) return;

    const userMessage: ChatMessage = { id: createMessageId(), role: 'user', content };
    const nextMessages = [...messages, userMessage];
    appendMessage(userMessage);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/workchat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: body }) => ({ role, content: body })),
          assessment: data,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'チャットの呼び出しに失敗しました。');
      }

      const json = (await res.json()) as {
        reply: string;
        stage?: string;
        bands?: Record<string, unknown>;
        guide?: StageGuide;
      };
      const plan = parseWorkPlan(json.reply.trim());
      appendMessage({
        id: createMessageId(),
        role: 'assistant',
        content: json.reply,
        plan,
        guide: json.guide,
      });
      setContext({ stage: json.stage, bands: json.bands });
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
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        void sendMessage(input);
      }
    }
  };

  useEffect(() => {
    if (!hasHydrated || hasStartedRef.current || loading || messages.length > 0) {
      return;
    }

    hasStartedRef.current = true;

    const kickoff = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/workchat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user' as const, content: 'ワークブックを始めたいです。' }],
            assessment: data,
          }),
        });

        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || 'チャットの呼び出しに失敗しました。');
        }

        const json = (await res.json()) as {
          reply: string;
          stage?: string;
          bands?: Record<string, unknown>;
          guide?: StageGuide;
        };
        const reply = json.reply.trim();
        const plan = parseWorkPlan(reply);
        appendMessage({
          id: createMessageId(),
          role: 'assistant',
          content: json.reply,
          plan,
          guide: json.guide,
        });
        setContext({ stage: json.stage, bands: json.bands });
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? 'チャットの呼び出しに失敗しました。');
        hasStartedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    void kickoff();
  }, [appendMessage, data, hasHydrated, loading, messages.length]);

  if (!hasHydrated) {
    return (
      <section className="card space-y-4 p-6">
        <h2 className="text-xl font-bold text-white">ワーク（試験運用）</h2>
        <p className="text-sm text-gray-400">読み込み中です…</p>
      </section>
    );
  }

  return (
    <section className="card flex h-[min(80vh,600px)] flex-col space-y-4 p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">ワーク（試験運用）</h2>
          {context.stage ? (
            <p className="text-xs text-gray-500">{`ステージ: ${context.stage}`}</p>
          ) : null}
        </div>
        <Link href="/" className="btn-secondary whitespace-nowrap text-xs sm:text-sm">
          トップに戻る
        </Link>
      </header>
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-[#0b1026] p-4"
      >
        {displayedMessages.length === 0 ? null : (
          displayedMessages.map((message) => (
            <div
              key={message.id}
              className={clsx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={clsx(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#151b39] text-gray-100',
                )}
              >
                {message.role === 'assistant' ? (
                  message.guide ? (
                    <StageGuideMessage guide={message.guide} />
                  ) : message.plan ? (
                    <WorkPlanMessage plan={message.plan} />
                  ) : (
                    message.content
                  )
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        <div className="rounded-xl border border-white/10 bg-[#0f1530] p-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={5}
            className="h-32 w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
            placeholder="例：今日はどこから始めればいい？"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>残り文字数: {Math.max(0, remaining)}</span>
          <span>Enterで改行 / Shift+Enterで送信</span>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn" disabled={!canSend}>
            {loading ? '送信中…' : '送信'}
          </button>
        </div>
      </form>
    </section>
  );
}
