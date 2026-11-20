import type { Metadata } from "next";
import { Tomorrow, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/trpc/provider";

const tomorrow = Tomorrow({
  variable: "--font-tomorrow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Academic Result Scraper — Accelerated Student Portal Proxy",
  description: "Look up KTU semester results and watch for grades using your active portal session.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${tomorrow.variable} ${inter.variable} ${jetBrainsMono.variable} antialiased bg-[#0F0F0E] text-[#F2EFE8]`}
      >
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
