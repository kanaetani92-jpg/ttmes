'use client';

import Link from 'next/link';
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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

type SessionSummary = {
  id: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const createMessageId = () => crypto.randomUUID();
const MAX_MESSAGE_LENGTH = 5000;
const INITIAL_HISTORY_LIMIT = 5;
const HISTORY_PAGE_SIZE = 5;
const SESSION_SUMMARY_LIMIT = 20;
const RECENT_SESSION_BUTTON_COUNT = 3;

const BULLET_PATTERN = /^(?:[・\-‐*●○▲▼]|[0-9０-９]+[.)）]|[a-zA-Z]+[.)）])\s*(.+)$/;

const normalizeExampleText = (value: string): string => {
  return value.replace(/[。．｡！？!？\s]+$/gu, '').trim();
};

const extractExampleChoices = (content: string): string[] => {
  const seen = new Set<string>();
  const normalizedContent = content.replace(/\r?\n/g, '\n');
  const exampleIndex = normalizedContent.indexOf('例えば');
  const targetForInline = exampleIndex === -1 ? normalizedContent : normalizedContent.slice(exampleIndex);
  const lines = targetForInline.split('\n');

  if (lines.length > 0) {
    const firstLine = lines[0];
    const inlineStart = firstLine.indexOf('例えば');
    const inlineSegment = inlineStart === -1 ? '' : firstLine.slice(inlineStart + '例えば'.length);
    if (inlineSegment.trim().length > 0) {
      const inlineCandidates = inlineSegment
        .replace(/^[、,。．｡\s]+/gu, '')
        .split(/[、,]/u)
        .map((part) => normalizeExampleText(part))
        .filter((part) => part.length > 0);
      if (inlineCandidates.length >= 1) {
        inlineCandidates.forEach((candidate) => seen.add(candidate));
      }
    }
  }

  const allLines = normalizedContent.split('\n');
  for (const rawLine of allLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(BULLET_PATTERN);
    if (match) {
      const choice = normalizeExampleText(match[1]);
      if (choice) {
        seen.add(choice);
      }
    }
  }

  return Array.from(seen);
};

const buildExampleChoicePrompt = (choice: string): string => {
  const normalized = normalizeExampleText(choice);
  return normalized ? `「${normalized}」について詳しく教えてください。` : '';
};

const buildStageChoicePrompt = (choice: string): string => {
  const normalized = normalizeExampleText(choice);
  return normalized ? `「${normalized}」に取り組みたいです。` : '';
};

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

const sessionDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const formatSessionLabel = (summary: SessionSummary, index: number): string => {
  const target = summary.updatedAt ?? summary.createdAt;
  if (!target) {
    return `チャット ${index + 1}`;
  }
  return `${sessionDateFormatter.format(target)} 更新`;
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
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isMobileInputMode, setIsMobileInputMode] = useState(false);
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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateMode = () => setIsMobileInputMode(mediaQuery.matches);

    updateMode();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateMode);
      return () => mediaQuery.removeEventListener('change', updateMode);
    }

    mediaQuery.addListener(updateMode);
    return () => mediaQuery.removeListener(updateMode);
  }, []);

  const refreshSessionSummaries = useCallback(async (): Promise<{ summaries: SessionSummary[]; userId: string | null }> => {
    if (isMountedRef.current) {
      setSessionsLoading(true);
    }

    try {
      const auth = authRef.current ?? getFirebaseAuth();
      authRef.current = auth;
      const user = auth.currentUser;
      if (!user) {
        if (isMountedRef.current) {
          setSessionSummaries([]);
          setActiveSessionId(null);
        }
        return { summaries: [], userId: null };
      }

      const db = dbRef.current ?? getFirebaseDb();
      dbRef.current = db;
      const sessionsCollection = collection(db, 'users', user.uid, 'workSessions');

      let lastError: unknown = null;
      for (const field of ['updatedAt', 'createdAt'] as const) {
        try {
          const constraints: QueryConstraint[] = [orderBy(field, 'desc'), limit(SESSION_SUMMARY_LIMIT)];
          const snapshot = await getDocs(query(sessionsCollection, ...constraints));
          const summaries = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() as { createdAt?: unknown; updatedAt?: unknown };
            return {
              id: docSnap.id,
              createdAt: toDate(data.createdAt ?? null),
              updatedAt: toDate(data.updatedAt ?? null),
            } satisfies SessionSummary;
          });
          if (isMountedRef.current) {
            setSessionSummaries(summaries);
          }
          return { summaries, userId: user.uid };
        } catch (attemptError) {
          lastError = attemptError;
        }
      }

      if (lastError) {
        throw lastError;
      }

      if (isMountedRef.current) {
        setSessionSummaries([]);
      }
      return { summaries: [], userId: user.uid };
    } catch (sessionError) {
      if (isMountedRef.current) {
        setSessionSummaries([]);
      }
      console.error('Failed to refresh work chat sessions', sessionError);
      throw sessionError;
    } finally {
      if (isMountedRef.current) {
        setSessionsLoading(false);
      }
    }
  }, []);

  const fetchExistingSession = useCallback(async (): Promise<SessionInfo | null> => {
    try {
      const { summaries, userId } = await refreshSessionSummaries();
      if (!userId || summaries.length === 0) {
        sessionRef.current = null;
        return null;
      }

      const sessionId = summaries[0]?.id;
      if (!sessionId) {
        sessionRef.current = null;
        return null;
      }

      const info: SessionInfo = { userId, sessionId };
      sessionRef.current = info;
      setActiveSessionId((prev) => prev ?? sessionId);
      return info;
    } catch (sessionError) {
      console.error('Failed to resolve existing work chat session', sessionError);
      throw sessionError;
    }
  }, [refreshSessionSummaries]);

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
  const recentSessions = useMemo(
    () => sessionSummaries.slice(0, RECENT_SESSION_BUTTON_COUNT),
    [sessionSummaries],
  );
  const olderSessions = useMemo(
    () => sessionSummaries.slice(RECENT_SESSION_BUTTON_COUNT),
    [sessionSummaries],
  );
  const olderSelectValue = useMemo(() => {
    if (!activeSessionId) {
      return '';
    }
    return olderSessions.some((session) => session.id === activeSessionId) ? activeSessionId : '';
  }, [activeSessionId, olderSessions]);
  const controlsDisabled = historyLoading || sessionsLoading;

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
      setActiveSessionId(info.sessionId);
      setSessionSummaries((prev) => {
        const now = new Date();
        const filtered = prev.filter((summary) => summary.id !== info.sessionId);
        const updated: SessionSummary = {
          id: info.sessionId,
          createdAt: now,
          updatedAt: now,
        };
        return [updated, ...filtered].slice(0, SESSION_SUMMARY_LIMIT);
      });
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
            setActiveSessionId(null);
          }
          sessionRef.current = null;
          historyCursorRef.current = null;
          return;
        }

        historyCursorRef.current = null;
        if (isMountedRef.current) {
          setHasMoreHistory(false);
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
        setSessionSummaries((prev) => {
          const now = new Date();
          const existing = prev.find((summary) => summary.id === session.sessionId);
          const filtered = prev.filter((summary) => summary.id !== session.sessionId);
          const updated: SessionSummary = {
            id: session.sessionId,
            createdAt: existing?.createdAt ?? now,
            updatedAt: now,
          };
          return [updated, ...filtered].slice(0, SESSION_SUMMARY_LIMIT);
        });
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
    if (isMobileInputMode) {
      return;
    }

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

  const handleSessionSelect = useCallback(
    async (sessionId: string) => {
      if (!sessionId || sessionId === activeSessionId || historyLoadingRef.current) {
        return;
      }

      try {
        const auth = authRef.current ?? getFirebaseAuth();
        authRef.current = auth;
        const user = auth.currentUser;
        if (!user) {
          setError('ログイン情報が取得できませんでした。再度ログインしなおしてください。');
          return;
        }

        const info: SessionInfo = { userId: user.uid, sessionId };
        sessionRef.current = info;
        setActiveSessionId(sessionId);
        historyCursorRef.current = null;
        setHasMoreHistory(false);
        setMessages([]);
        setHistoryError(null);
        setHistoryInitialized(false);
        historyLoadingRef.current = true;
        if (isMountedRef.current) {
          setHistoryLoading(true);
        }

        try {
          await loadHistoryBatch({ initial: true });
        } catch (switchError) {
          if (isMountedRef.current) {
            console.error('Failed to switch work chat session', switchError);
            setHistoryError('チャット履歴の読み込みに失敗しました。');
          }
        } finally {
          historyLoadingRef.current = false;
          if (isMountedRef.current) {
            setHistoryLoading(false);
            setHistoryInitialized(true);
          }
        }
      } catch (switchError) {
        console.error('Failed to select work chat session', switchError);
        if (isMountedRef.current) {
          setError('チャットの読み込み中にエラーが発生しました。再度お試しください。');
        }
      }
    },
    [activeSessionId, loadHistoryBatch],
  );

  const handleNewChat = useCallback(async () => {
    if (sessionsLoading) {
      return;
    }

    try {
      sessionRef.current = null;
      sessionPromiseRef.current = null;
      const info = await ensureSession();
      setMessages([]);
      setHasMoreHistory(false);
      setHistoryError(null);
      setHistoryInitialized(true);
      historyCursorRef.current = null;
      historyLoadingRef.current = false;
      setHistoryLoading(false);
      setError(null);
      setActiveSessionId(info.sessionId);
      autoScrollRef.current = true;
      void refreshSessionSummaries().catch((refreshError) => {
        console.error('Failed to refresh work chat sessions after creating new session', refreshError);
      });
    } catch (createError) {
      console.error('Failed to start new work chat session', createError);
      setError('新しいチャットを開始できませんでした。時間をおいて再度お試しください。');
    }
  }, [ensureSession, refreshSessionSummaries, sessionsLoading]);

  return (
    <section className="card flex w-full flex-1 flex-col gap-5 p-4 pb-6 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative inline-flex">
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/40 via-blue-400/20 to-transparent blur-sm"
          />
          <h2 className="relative inline-flex items-center rounded-2xl bg-blue-500/10 px-4 py-2 text-base font-semibold text-white shadow-inner sm:text-xl">
            ワーク（試験運用）
          </h2>
        </div>
        <Link
          href="/"
          className="btn-secondary inline-flex items-center justify-center whitespace-nowrap text-xs sm:self-auto sm:text-sm"
        >
          トップに戻る
        </Link>
      </header>
      <div className="flex flex-1 flex-col gap-6">
        <div className="space-y-3 rounded-3xl border border-white/10 bg-[#0f1632]/90 p-3 shadow-inner sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="btn inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm"
              onClick={() => {
                void handleNewChat();
              }}
              disabled={controlsDisabled}
            >
              新しくチャットを始める
            </button>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">過去のチャット</div>
              {sessionsLoading ? (
                <div className="text-xs text-gray-400">チャット履歴を読み込み中…</div>
              ) : sessionSummaries.length === 0 ? (
                <div className="text-xs text-gray-400">過去のチャットはまだありません。</div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:items-end">
                    {recentSessions.map((summary, index) => {
                      const isActive = summary.id === activeSessionId;
                      return (
                        <button
                          key={summary.id}
                          type="button"
                          className={clsx(
                            'w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-white transition hover:border-blue-300/60 hover:bg-blue-500/10 disabled:opacity-60 sm:w-60 sm:text-sm',
                            isActive ? 'border-blue-300/70 bg-blue-500/20 text-white' : '',
                          )}
                          onClick={() => {
                            void handleSessionSelect(summary.id);
                          }}
                          disabled={controlsDisabled}
                        >
                          {formatSessionLabel(summary, index)}
                        </button>
                      );
                    })}
                  </div>
                  {olderSessions.length > 0 ? (
                    <select
                      value={olderSelectValue}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value) {
                          void handleSessionSelect(value);
                        }
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-[#1c2750] px-3 py-2 text-xs font-semibold text-white outline-none transition hover:border-blue-300/60 focus:border-blue-300/60 focus:bg-[#25366f] focus:text-white sm:w-60 sm:text-sm"
                      disabled={controlsDisabled}
                    >
                      <option value="" className="bg-[#101b3a] text-white">
                        過去のチャットを選択
                      </option>
                      {olderSessions.map((summary, index) => (
                        <option key={summary.id} value={summary.id} className="bg-[#101b3a] text-white">
                          {formatSessionLabel(summary, index + RECENT_SESSION_BUTTON_COUNT)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-3 rounded-3xl border border-white/10 bg-[#0f1632]/90 p-3 shadow-inner sm:p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">現在のステージ</div>
            <div className="text-lg font-semibold text-white">{stageMetadata.stageName}</div>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-200">
            {stageMetadata.description}
          </p>
          <div className="flex flex-col gap-2 pt-1">
            {stageMetadata.choices.map((choice) => {
              const prompt = buildStageChoicePrompt(choice);
              if (!prompt) {
                return null;
              }
              return (
                <button
                  key={choice}
                  type="button"
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/10 disabled:opacity-60 sm:text-sm"
                  onClick={() => handleChoiceSelect(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-[#0b1026]/90 p-3 pr-4 shadow-inner sm:p-4"
            style={{ maxHeight: '30rem', minHeight: '20rem' }}
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
                      messages.map((message) => {
                        const isAssistant = message.role === 'assistant';
                        const exampleChoices = isAssistant ? extractExampleChoices(message.content) : [];
                        return (
                          <div key={message.id} className={clsx('flex flex-col gap-2', isAssistant ? 'items-start' : 'items-end')}>
                            <div
                              className={clsx(
                                'max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/20',
                                isAssistant
                                  ? 'bg-[#151b39]/90 text-gray-100 backdrop-blur'
                                  : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white',
                              )}
                            >
                              {message.content}
                            </div>
                            {isAssistant && exampleChoices.length > 0 ? (
                              <div className="flex max-w-[85%] flex-col gap-2">
                                {exampleChoices.map((choice) => {
                                  const prompt = buildExampleChoicePrompt(choice);
                                  if (!prompt) {
                                    return null;
                                  }
                                  return (
                                    <button
                                      key={choice}
                                      type="button"
                                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/10 disabled:opacity-60 sm:text-sm"
                                      onClick={() => handleChoiceSelect(prompt)}
                                      disabled={loading}
                                    >
                                      {prompt}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3 pb-2 sm:pb-4">
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
            <div className="flex items-end gap-3 rounded-3xl border border-white/10 bg-[#101836]/90 p-3 shadow-lg shadow-black/20 sm:p-4">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={MAX_MESSAGE_LENGTH}
                rows={4}
                className="min-h-[120px] flex-1 resize-none border-none bg-transparent text-sm text-white outline-none placeholder:text-gray-500 sm:min-h-[96px]"
                placeholder="メッセージを入力"
              />
              <button type="submit" className="btn whitespace-nowrap" disabled={!canSend}>
                {loading ? '送信中…' : '送信'}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
              <span>残り文字数: {Math.max(0, remaining)}</span>
              <span>
                {isMobileInputMode ? '送信ボタンで送信 / Enterで改行' : 'Shift+Enterで改行 / Enterで送信'}
              </span>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
