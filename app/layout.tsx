import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SentiScope — Analisis Sentimen Teks Indonesia",
  description:
    "Dashboard analisis sentimen teks Indonesia menggunakan IndoBERTweet, mBERT, dan InSet Lexicon. Upload CSV dan analisis komentar, ulasan, atau teks apapun.",
  keywords: ["sentiment analysis", "indonesia", "nlp", "data mining", "indobertweet", "lexicon"],
  authors: [{ name: "UNPAM Data Mining" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={inter.variable} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sentiscope-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
