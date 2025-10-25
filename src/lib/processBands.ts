export const PROCESS_LABELS = {
  experiential: '体験的・認知的プロセス 🔎🧠',
  behavioral: '行動的プロセス 🏃‍♀️✅',
} as const;

const DEFAULT_BAND_LABELS: Record<string, string> = {
  LOW: '要注意 ⚠️',
  MID: '普通 🙂🟡',
  HIGH: '問題なし 🟢😄✅',
  ATTN: '要注意 ⚠️',
  OK: '問題なし 🟢😄✅',
};

export const getProcessBandLabel = (band?: string): string | null => {
  if (!band) return null;
  return DEFAULT_BAND_LABELS[band] ?? band;
};
