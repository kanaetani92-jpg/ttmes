'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { Auth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebaseClient';
import { useAssessment } from './AssessmentStore';
import { DEFAULT_STAGE, getStageMetadata } from '@/lib/workChat';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date | null;
};

const createMessageId = () => crypto.randomUUID();
const MAX_MESSAGE_LENGTH = 5000;
const INITIAL_HISTORY_LIMIT = 5;
const HISTORY_PAGE_SIZE = 20;

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    try {
      const date = value.toDate();
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
    } catch (error) {
      console.error('Failed to convert Firestore timestamp', error);
      return null;
    }
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

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
  const [historyInitialized, setHistoryInitialized] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const authRef = useRef<Auth | null>(null);
  const dbRef = useRef<Firestore | null>(null);
  const sessionRef = useRef<SessionInfo | null>(null);
  const sessionPromiseRef = useRef<Promise<SessionInfo> | null>(null);
  const historyCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const historyLoadingRef = useRef(false);
  const autoScrollRef = useRef(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!autoScrollRef.current) {
      return;
    }
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

  const fetchExistingSession = useCallback(async (): Promise<SessionInfo | null> => {
    try {
      const auth = authRef.current ?? getFirebaseAuth();
      authRef.current = auth;
      const user = auth.currentUser;
      if (!user) {
        return null;
      }

      const db = dbRef.current ?? getFirebaseDb();
      dbRef.current = db;
      const sessionsCollection = collection(db, 'users', user.uid, 'workSessions');

      let lastError: unknown = null;
      for (const field of ['updatedAt', 'createdAt'] as const) {
        try {
          const constraints: QueryConstraint[] = [orderBy(field, 'desc'), limit(1)];
          const snapshot = await getDocs(query(sessionsCollection, ...constraints));
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            const info: SessionInfo = { userId: user.uid, sessionId: docSnap.id };
            sessionRef.current = info;
            return info;
          }
        } catch (attemptError) {
          lastError = attemptError;
        }
      }

      if (lastError) {
        throw lastError;
      }

      return null;
    } catch (sessionError) {
      console.error('Failed to resolve existing work chat session', sessionError);
      throw sessionError;
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
      historyCursorRef.current = null;
      setHasMoreHistory(false);
      return info;
    };

    sessionPromiseRef.current = createSession().finally(() => {
      sessionPromiseRef.current = null;
    });

    return sessionPromiseRef.current;
  }, []);

  const loadHistoryBatch = useCallback(
    async ({ initial = false }: { initial?: boolean } = {}) => {
      const session = sessionRef.current;
      if (!session) {
        return 0;
      }

      const db = dbRef.current ?? getFirebaseDb();
      dbRef.current = db;

      const limitCount = initial ? INITIAL_HISTORY_LIMIT : HISTORY_PAGE_SIZE;
      const messagesCollection = collection(
        db,
        'users',
        session.userId,
        'workSessions',
        session.sessionId,
        'messages',
      );

      const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
      const cursor = historyCursorRef.current;
      if (!initial && cursor) {
        constraints.push(startAfter(cursor));
      }
      constraints.push(limit(limitCount));

      const snapshot = await getDocs(query(messagesCollection, ...constraints));
      if (snapshot.empty) {
        if (initial) {
          if (!isMountedRef.current) {
            return 0;
          }
          setMessages([]);
        }
        setHasMoreHistory(false);
        if (initial) {
          historyCursorRef.current = null;
        }
        return 0;
      }

      historyCursorRef.current = snapshot.docs[snapshot.docs.length - 1];
      setHasMoreHistory(snapshot.size === limitCount);

      const remoteMessages = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data() as { role?: string; content?: unknown; createdAt?: unknown };
          const role = data.role === 'assistant' ? 'assistant' : data.role === 'user' ? 'user' : null;
          const content = typeof data.content === 'string' ? data.content : null;
          if (!role || !content) {
            return null;
          }
          return {
            id: docSnap.id,
            role,
            content,
            createdAt: toDate(data.createdAt ?? null),
          } satisfies ChatMessage;
        })
        .filter((message): message is ChatMessage => message !== null)
        .reverse();

      if (!isMountedRef.current) {
        return remoteMessages.length;
      }

      if (initial) {
        autoScrollRef.current = true;
        setMessages(remoteMessages);
        return remoteMessages.length;
      }

      if (remoteMessages.length === 0) {
        return 0;
      }

      const node = scrollRef.current;
      const previousHeight = node?.scrollHeight ?? 0;
      const previousTop = node?.scrollTop ?? 0;
      autoScrollRef.current = false;
      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id));
        const deduped = remoteMessages.filter((message) => !existingIds.has(message.id));
        if (deduped.length === 0) {
          return prev;
        }
        return [...deduped, ...prev];
      });
      if (node) {
        requestAnimationFrame(() => {
          const current = scrollRef.current;
          if (!current) return;
          const newHeight = current.scrollHeight;
          current.scrollTop = previousTop + (newHeight - previousHeight);
        });
      }

      return remoteMessages.length;
    },
    [],
  );

  useEffect(() => {
    let active = true;

    const loadInitialHistory = async () => {
      historyLoadingRef.current = true;
      if (isMountedRef.current) {
        setHistoryLoading(true);
        setHistoryError(null);
      }
      try {
        const existingSession = await fetchExistingSession();
        if (!existingSession) {
          if (isMountedRef.current) {
            setMessages([]);
            setHasMoreHistory(false);
          }
          return;
        }

        await loadHistoryBatch({ initial: true });
      } catch (historyLoadError) {
        if (active && isMountedRef.current) {
          console.error('Failed to load work chat history', historyLoadError);
          setHistoryError('チャット履歴の読み込みに失敗しました。');
        }
      } finally {
        historyLoadingRef.current = false;
        if (active && isMountedRef.current) {
          setHistoryLoading(false);
          setHistoryInitialized(true);
        }
      }
    };

    void loadInitialHistory();

    return () => {
      active = false;
    };
  }, [fetchExistingSession, loadHistoryBatch]);

  const loadMoreHistory = useCallback(async () => {
    if (historyLoadingRef.current || !hasMoreHistory) {
      return;
    }

    historyLoadingRef.current = true;
    if (isMountedRef.current) {
      setHistoryLoading(true);
      setHistoryError(null);
    }

    try {
      await loadHistoryBatch();
    } catch (moreError) {
      if (isMountedRef.current) {
        console.error('Failed to load older chat messages', moreError);
        setHistoryError('これより前のメッセージを読み込めませんでした。');
      }
    } finally {
      historyLoadingRef.current = false;
      if (isMountedRef.current) {
        setHistoryLoading(false);
      }
    }
  }, [hasMoreHistory, loadHistoryBatch]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const handleScroll = () => {
      if (node.scrollTop <= 40) {
        void loadMoreHistory();
      }
    };

    node.addEventListener('scroll', handleScroll);
    return () => {
      node.removeEventListener('scroll', handleScroll);
    };
  }, [loadMoreHistory]);

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
      autoScrollRef.current = true;
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

    const userMessage: ChatMessage = { id: createMessageId(), role: 'user', content, createdAt: new Date() };
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
        createdAt: new Date(),
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
    <section className="card flex h-[min(90vh,800px)] flex-col space-y-4 p-6">
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
        <div className="flex flex-col gap-2 pt-1">
          {stageMetadata.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/10 disabled:opacity-60"
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
        className="flex-1 min-h-[360px] overflow-y-auto rounded-3xl border border-white/10 bg-[#0b1026]/90 p-4 shadow-inner"
      >
        <div className="flex min-h-full flex-col justify-end">
          <div className="flex flex-col gap-3">
            {!historyInitialized && historyLoading ? (
              <div className="text-center text-xs text-gray-400">チャット履歴を読み込み中…</div>
            ) : (
              <>
                {historyLoading && historyInitialized && hasMoreHistory ? (
                  <div className="text-center text-[11px] text-gray-400">過去のメッセージを読み込み中…</div>
                ) : null}
                {historyError ? (
                  <p className="text-center text-xs text-red-300">{historyError}</p>
                ) : null}
                {messages.length === 0 ? (
                  <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 text-center shadow-inner">
                    <p className="text-sm leading-relaxed text-gray-300">
                      まだメッセージがありません。最初のメッセージを送ってみましょう。
                    </p>
                  </div>
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
              </>
            )}
          </div>
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
