import type { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import "./globals.css";

const varsity = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-varsity",
});

export const metadata: Metadata = {
  title: "EVG Training Management",
  description: "EVG Training Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${varsity.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-black text-white">
        {children}
      </body>
    </html>
  );
}
