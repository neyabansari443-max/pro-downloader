import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react"; // <--- NEW
import { SpeedInsights } from "@vercel/speed-insights/next"; // <--- NEW
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ProDownloader - Free 4K YouTube Video Downloader & MP3 Converter",
  description: "Download YouTube videos in 4K, 1080p, and MP3 audio for free. Fast, unlimited, and no ads. The best online video downloader.",
  keywords: ["YouTube Downloader", "4K Video Downloader", "MP3 Converter", "YouTube to MP3", "Free Video Saver", "1080p Download"],
  authors: [{ name: "ProDownloader Team" }],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "ProDownloader - Download YouTube Videos in 4K",
    description: "Save YouTube videos and audio instantly in professional quality. Fast & Free.",
    url: "https://pro-downloader.vercel.app",
    siteName: "ProDownloader",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ProDownloader - High Quality Video Downloader",
    description: "Download YouTube videos properly. No ads, 4K support.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900 text-white`}
      >
        {children}
        <Analytics /> {/* <--- Yahan add kiya */}
        <SpeedInsights /> {/* <--- Yahan add kiya */}
      </body>
    </html>
  );
}