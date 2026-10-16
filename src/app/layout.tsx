import type { Metadata, Viewport } from "next";
import { Manrope, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["600", "700", "800"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Eastledge Interiors — Fortnight wages",
  description: "Book fixer wages by the fortnight for Eastledge Interiors.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#234b3e",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className={`${syne.variable} ${manrope.variable}`}>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
