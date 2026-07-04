import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SupabaseNetworkErrorGuard } from "@/components/supabase-network-error-guard";

export const metadata: Metadata = {
  title: "Tolo Admin",
  description: "Tolo electric-motorcycle financing admin portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        <SupabaseNetworkErrorGuard />
        {children}
      </body>
    </html>
  );
}
