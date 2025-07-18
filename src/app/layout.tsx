import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { Navbar } from '@/components/molecules/navbar';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat'
});

export const metadata: Metadata = {
  title: 'Cutless AI',
  description: 'Cutless AI is a tool that helps you create emails with images'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${montserrat.className} antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
