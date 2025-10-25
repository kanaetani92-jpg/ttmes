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
        <div className="container">
          <h1 className="text-2xl font-bold mb-4">TTM エキスパートシステム</h1>
          {children}
          <footer className="mt-10 text-sm text-gray-400">© {new Date().getFullYear()} TTM</footer>
        </div>
      </body>
    </html>
  );
}
