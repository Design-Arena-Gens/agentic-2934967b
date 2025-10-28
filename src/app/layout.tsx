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
  title: "Twitter AI Workflow Builder",
  description:
    "Generate an end-to-end n8n workflow for AI-powered Twitter publishing, engagement, and outreach.",
  metadataBase: new URL("https://agentic-2934967b.vercel.app"),
  openGraph: {
    title: "Twitter AI Workflow Builder",
    description:
      "Create a full n8n automation that generates AI tweets, posts with imagery, engages audiences, and sends outreach messages.",
    url: "https://agentic-2934967b.vercel.app",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-white antialiased dark:bg-black`}
      >
        {children}
      </body>
    </html>
  );
}
