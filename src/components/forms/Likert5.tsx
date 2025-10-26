'use client';

import type { Likert5, Likert5Value } from '@/lib/assessment';

type Props = {
  value: Likert5Value;
  onChange: (value: Likert5) => void;
  disabled?: boolean;
  labels?: readonly string[];
};

export function Likert5({ value, onChange, disabled, labels }: Props) {
  return (
    <div className="flex flex-wrap gap-2 md:flex-col md:items-stretch">
      {[1, 2, 3, 4, 5].map((v, index) => (
        <button
          key={v}
          type="button"
          disabled={disabled}
          aria-pressed={value === v}
          className={`rounded-lg border px-3 py-2 text-left text-sm leading-snug transition whitespace-normal ${
            value === v
              ? 'border-blue-400 bg-blue-500 text-black'
              : 'border-[#2a315a] bg-[#0e1330] text-white'
          } ${
            disabled
              ? 'cursor-not-allowed opacity-60'
              : value === v
                ? ''
                : 'hover:border-blue-400/60'
          } md:w-full`}
          onClick={() => {
            if (disabled) return;
            onChange(v as Likert5);
          }}
        >
          {labels?.[index] ?? String(v)}
        </button>
      ))}
    </div>
  );
}
