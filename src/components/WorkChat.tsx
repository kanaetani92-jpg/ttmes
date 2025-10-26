'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { useAssessment } from './AssessmentStore';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type ChatContext = {
  stage?: string;
  bands?: Record<string, unknown>;
};

const createMessageId = () => crypto.randomUUID();

export function WorkChat() {
  const { data, hasHydrated } = useAssessment();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ChatContext>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading && hasHydrated, [input, loading, hasHydrated]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const toggleOpen = () => {
    setOpen((prev) => !prev);
  };

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSend) return;

    const content = input.trim();
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
      appendMessage({ id: createMessageId(), role: 'assistant', content: json.reply });
      setContext({ stage: json.stage, bands: json.bands });
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? 'チャットの呼び出しに失敗しました。');
      setMessages((prev) => prev.slice(0, -1));
      setInput(content);
    } finally {
      setLoading(false);
    }
  };

  if (!hasHydrated) {
    return (
      <button type="button" className="btn" disabled>
        ワークをする
      </button>
    );
  }

  return (
    <div className="relative">
      <button type="button" className="btn" onClick={toggleOpen}>
        {open ? 'チャットを閉じる' : 'ワークをする'}
      </button>
      {open ? (
        <div className="fixed bottom-6 right-6 z-50 w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1026] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Geminiコーチ</p>
              {context.stage ? (
                <p className="text-xs text-gray-400">ステージ: {context.stage}</p>
              ) : (
                <p className="text-xs text-gray-400">質問紙の回答に基づく提案</p>
              )}
            </div>
            <button type="button" className="text-xs text-blue-200" onClick={toggleOpen}>
              閉じる
            </button>
          </div>
          <div ref={scrollRef} className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <p className="text-xs text-gray-400">
                質問や希望を入力すると、Geminiが最新の骨子から実行しやすい提案を整えます。
              </p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={clsx('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={clsx(
                      'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                      message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-[#151b39] text-gray-100',
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSend} className="space-y-2 border-t border-white/10 px-4 py-3">
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="flex-1 rounded-full border border-white/10 bg-[#0f1530] px-3 py-2 text-sm text-white placeholder:text-gray-500"
                placeholder="例：今日はどこから始めればいい？"
              />
              <button type="submit" className="btn" disabled={!canSend}>
                {loading ? '送信中…' : '送信'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
