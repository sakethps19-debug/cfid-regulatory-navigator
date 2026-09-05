import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Source_Serif_4, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const heading = Source_Serif_4({ subsets: ["latin"], variable: "--font-heading", weight: ["600", "700"] });
const body = Source_Sans_3({ subsets: ["latin"], variable: "--font-body", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "CFID Regulatory Navigator",
  description: "Internal legal-research pilot for CFID orders and provisions.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${heading.variable} ${body.variable}`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
