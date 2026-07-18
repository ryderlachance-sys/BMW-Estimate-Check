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
    default: "BMW Estimate Check — Stop Overpaying for BMW Repairs",
    template: "%s | BMW Estimate Check",
  },
  description:
    "Upload your BMW mechanic estimate. Our AI compares it against OEM and premium aftermarket part prices so you know exactly how much you can save.",
  openGraph: {
    type: "website",
    siteName: "BMW Estimate Check",
    title: "BMW Estimate Check — Stop Overpaying for BMW Repairs",
    description:
      "AI-powered estimate analysis for BMW owners. Compare mechanic quotes with real part prices and buy the parts yourself.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "BMW Estimate Check",
    description: "Stop overpaying for BMW repairs. Compare your mechanic's estimate with real part prices.",
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
