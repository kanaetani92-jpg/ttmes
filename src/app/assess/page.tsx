import Link from 'next/link';

const ITEMS = [
  { href: '/assess/stage', label: '変容ステージ（設問1）' },
  { href: '/assess/risci', label: 'RISCI（ストレス／コーピング）' },
  { href: '/assess/sma', label: 'SMA（ストレスマネジメント活動）' },
  { href: '/assess/pssm', label: 'PSSM（自己効力感）' },
  { href: '/assess/pdsm', label: 'PDSM（意思決定バランス）' },
  { href: '/assess/ppsm', label: 'PPSM（変容プロセス）' },
  { href: '/assess/feedback', label: 'フィードバック' },
];

export default function AssessIndex() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">オンラインアセスメント</h1>
        <p className="text-sm text-gray-400">5つの質問紙に回答したあと、フィードバックを生成してください。</p>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="card block p-5 transition hover:opacity-90">
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
