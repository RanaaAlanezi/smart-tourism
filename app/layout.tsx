import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/AuthProvider";
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
  title: "Smart Tourism",
  description: "AI-powered discovery of Saudi landmarks",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <header className="border-b border-black/10 dark:border-white/10 px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg">
              Smart Tourism
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/">المعالم</Link>
              <Link href="/dashboard">لوحة النتائج</Link>
            </nav>
          </header>
          <div className="flex flex-col flex-1">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
