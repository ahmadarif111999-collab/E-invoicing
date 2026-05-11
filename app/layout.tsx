import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FBR Digital Invoicing SaaS',
  description: 'FBR-ready digital invoicing SaaS for Pakistani SMEs and accounting firms.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
