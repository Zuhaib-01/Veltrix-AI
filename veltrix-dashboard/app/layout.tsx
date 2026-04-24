import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Veltrix AI – Threat Intelligence Dashboard',
  description: 'Multilingual Phishing Detection & Threat Intelligence System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="noise">
        {children}
      </body>
    </html>
  );
}
