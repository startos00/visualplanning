import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Grimpo Lite",
  description: "A deep-sea canvas for strategy, execution, and research (local-only prototype).",
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<any>;
}) {
  const params = await props.params;
  const { children } = props;
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
