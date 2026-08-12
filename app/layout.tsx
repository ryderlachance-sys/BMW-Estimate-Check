import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Engine Genie — Stop Overpaying for Car Repairs",
    template: "%s | Engine Genie",
  },
  description:
    "Upload any mechanic estimate. We compare it against real part prices so you know how much you can save — then buy from Amazon, RockAuto, FCP Euro, or eBay.",
  openGraph: {
    type: "website",
    siteName: "Engine Genie",
    title: "Engine Genie — Stop Overpaying for Car Repairs",
    description:
      "AI-powered estimate analysis for any car. Compare mechanic quotes with real part prices and buy online.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Engine Genie",
    description: "Stop overpaying for repairs. Compare your estimate with real part prices.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
