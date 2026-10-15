import Script from "next/script";
import "./globals.css";

export const metadata = {
  title: "Crosscheck — Real-Time Fact Check & Forensics Desk",
  description: "Crosscheck: In-browser digital media forensics, deterministic trust scoring, evidence clustering, and tamper-evident proof vault.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
