import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "ShowShare — Share concerts with friends",
  description: "See what concerts your friends are going to and join them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-[#f0f0f5]">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
