import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '700', '900'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500'],
});

export const metadata: Metadata = {
  title: 'Compound Interest Calculator — Free Investment Growth Visualizer',
  description:
    'Calculate how compound interest grows your investments over time. Set your initial amount, monthly contributions, and annual return rate to see a live chart and year-by-year breakdown. Free, no signup required.',
  keywords: [
    'compound interest calculator',
    'investment calculator',
    'compound interest',
    'savings calculator',
    'wealth calculator',
    'investment growth',
    'monthly contribution calculator',
  ],
  openGraph: {
    title: 'Compound Interest Calculator — Watch Your Money Grow',
    description:
      'See exactly how compound interest grows your investments. Interactive chart, live updates, year-by-year breakdown. Free tool.',
    url: 'https://compoundviz.vercel.app',
    siteName: 'Compoundviz',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compound Interest Calculator',
    description:
      'See exactly how compound interest grows your investments. Interactive chart, live updates, year-by-year breakdown.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://compoundviz.vercel.app',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${dmSans.variable}`}>{children}</body>
      {gaId && <GoogleAnalytics gaId={gaId} />}
    </html>
  );
}
