import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import './globals.css';

const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'DroneOps — Fleet Visualisation',
  description: 'Real-time drone fleet monitoring and OSINT visualisation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
