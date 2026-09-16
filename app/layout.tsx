import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { AuthProvider } from "@/lib/AuthProvider";
import { Navbar } from "@/lib/components/Navbar";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Smart Tourism",
  description: "اكتشف السعودية بذكاء — منصة سياحية ذكية للمعالم السعودية",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <div className="flex flex-col flex-1">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
