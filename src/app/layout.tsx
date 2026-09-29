import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lanka Card Deals",
  description: "Real, current Sri Lankan bank credit card offers — a portfolio project.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-neutral-50 text-neutral-900">{children}</body>
    </html>
  );
}
