import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { FunnelTracker } from "@/components/funnel-tracker";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  applicationName: "Engine Genie",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(appUrl),
  title: {
    default: "Engine Genie — Compare Mechanic Parts Prices",
    template: "%s | Engine Genie",
  },
  description:
    "Upload a mechanic estimate, confirm the vehicle and repair parts, and compare shop charges with compatible retailer listings.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Engine Genie",
    title: "Engine Genie — Compare Mechanic Parts Prices",
    description: "Upload an estimate, confirm the car and parts, and compare retailer prices before buying.",
    url: appUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: "Engine Genie",
    description: "Upload an estimate, confirm the car and parts, and compare retailer prices before buying.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <FunnelTracker />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
