'use client';

import type { Likert5, Likert5Value } from '@/lib/assessment';

type Props = {
  value: Likert5Value;
  onChange: (value: Likert5) => void;
  disabled?: boolean;
};

export function Likert5({ value, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          aria-pressed={value === v}
          className={`rounded-lg border px-3 py-2 transition ${
            value === v
              ? 'border-blue-400 bg-blue-500 text-black'
              : 'border-[#2a315a] bg-[#0e1330] text-white'
          } ${
            disabled
              ? 'cursor-not-allowed opacity-60'
              : value === v
                ? ''
                : 'hover:border-blue-400/60'
          }`}
          onClick={() => {
            if (disabled) return;
            onChange(v as Likert5);
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
