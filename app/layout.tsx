import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Engine Genie — Stop Overpaying for Car Repairs",
    template: "%s | Engine Genie",
  },
  description:
    "Upload any mechanic estimate. Compare the quote with catalog reference prices, then verify current price and fitment with the retailer.",
  openGraph: {
    type: "website",
    siteName: "Engine Genie",
    title: "Engine Genie — Stop Overpaying for Car Repairs",
    description: "Estimate analysis for any car with catalog price comparisons and retailer links.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Engine Genie",
    description: "Stop overpaying for repairs. Compare your quote with catalog reference prices.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
