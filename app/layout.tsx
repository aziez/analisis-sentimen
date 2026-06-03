import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sentiment Analysis Dashboard | Facebook Comments",
  description:
    "Interactive dashboard untuk analisis sentimen komentar Facebook menggunakan VADER, TextBlob, dan Hugging Face Transformers.",
  keywords: ["sentiment analysis", "facebook", "nlp", "data mining", "dashboard"],
  authors: [{ name: "UNPAM Data Mining" }],
  openGraph: {
    title: "Sentiment Analysis Dashboard",
    description: "Analisis sentimen komentar Facebook dengan 3 model AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
