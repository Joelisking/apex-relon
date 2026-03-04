import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { CurrencyProvider } from '@/lib/context/currency-context';
import { Toaster } from '@/components/ui/sonner';
import QueryProvider from '@/components/providers/QueryProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const sora = Sora({
  weight: ['400', '600'],
  subsets: ['latin'],
  variable: '--font-dm-serif',
});

export const metadata: Metadata = {
  title: 'Apex Field OS',
  description:
    'AI-Enhanced CRM & Business Performance Dashboard for Apex Consulting & Surveying, Inc.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="font-sans antialiased overflow-hidden h-screen">
        <QueryProvider>
          <CurrencyProvider>
            <AuthProvider>{children}</AuthProvider>
          </CurrencyProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
