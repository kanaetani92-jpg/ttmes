import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'TTM Expert System',
  description: 'Vercel + Firebase + Gemini',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="container flex min-h-screen flex-col">
          <h1 className="mb-4 text-2xl font-bold">TTM エキスパートシステム</h1>
          <main className="flex-1 pb-8">{children}</main>
          <footer className="mt-auto pt-6 text-sm text-gray-400">© {new Date().getFullYear()} TTM</footer>
        </div>
      </body>
    </html>
  );
}
