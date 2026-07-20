import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DentiScribe AI',
  description: 'Local-first dental AI scribe',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
