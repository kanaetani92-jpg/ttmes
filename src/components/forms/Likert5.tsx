'use client';

import type { Likert5 } from '@/lib/assessment';

type Props = {
  value: Likert5;
  onChange: (value: Likert5) => void;
};

export function Likert5({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          className={`px-3 py-2 rounded-lg border transition ${
            value === v
              ? 'bg-blue-500 text-black border-blue-400'
              : 'border-[#2a315a] bg-[#0e1330] text-white hover:border-blue-400/60'
          }`}
          onClick={() => onChange(v as Likert5)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
