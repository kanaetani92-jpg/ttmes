'use client';

import Link from 'next/link';
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useAssessment } from './AssessmentStore';
import { WorkPlanMessage, type WorkPlan } from './WorkPlanMessage';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  plan?: WorkPlan;
};

type ChatContext = {
  stage?: string;
  bands?: Record<string, unknown>;
};

const createMessageId = () => crypto.randomUUID();
const MAX_MESSAGE_LENGTH = 5000;

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

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [messages]);

  const trimmedInput = useMemo(() => input.trim(), [input]);
  const displayedMessages = useMemo(() => [...messages].reverse(), [messages]);
  const canSend = trimmedInput.length > 0 && !loading && hasHydrated;
  const remaining = MAX_MESSAGE_LENGTH - input.length;

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const sendMessage = async (rawInput: string) => {
    if (loading || !hasHydrated) return;

    const content = rawInput.trim();
    if (!content) return;

    const userMessage: ChatMessage = { id: createMessageId(), role: 'user', content };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
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

      const json = (await res.json()) as { reply: string; stage?: string; bands?: Record<string, unknown> };
      const plan = parseWorkPlan(json.reply.trim());
      appendMessage({ id: createMessageId(), role: 'assistant', content: json.reply, plan });
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

  if (!hasHydrated) {
    return (
      <section className="card space-y-4 p-6">
        <h2 className="text-xl font-bold text-white">ワーク</h2>
        <p className="text-sm text-gray-400">読み込み中です…</p>
      </section>
    );
  }

  return (
    <section className="card flex h-[min(80vh,600px)] flex-col space-y-4 p-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">ワーク</h2>
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
                {message.role === 'assistant' && message.plan ? (
                  <WorkPlanMessage plan={message.plan} />
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
