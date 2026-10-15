import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "TrustLens — Real or Rendered? · Proof Desk",
  description: "Editorial in-browser digital media forensics, deterministic trust scoring, evidence clustering, and tamper-evident proof vault.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
