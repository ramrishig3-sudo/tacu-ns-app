import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "TacU- NS | Security & Learning Platform",
  description: "The hub for cutting-edge security tools and cybersecurity learning.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-50 selection:bg-teal-500/30">
        
        {/* Global Navigation Header */}
        <header className="fixed top-0 left-0 w-full h-20 z-50 bg-neutral-950/50 backdrop-blur-md border-b border-neutral-800/50 flex items-center px-6">
           <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 group">
                 <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-black font-black">T</div>
                 <span className="font-bold text-lg tracking-tight group-hover:text-teal-400 transition-colors">TacU-NS</span>
              </Link>
              
              <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-neutral-400">
                 <Link href="/apps/tacu-ns" className="hover:text-white transition-colors">App</Link>
                 <Link href="/learn" className="hover:text-teal-400 transition-colors">Learn</Link>
                 <Link href="/tools" className="hover:text-purple-400 transition-colors">Tools</Link>
                 <Link href="/about" className="hover:text-white transition-colors border border-neutral-800 px-4 py-2 rounded-full hover:bg-neutral-800">About Me</Link>
              </nav>
           </div>
        </header>

        <div className="flex-1">
          {children}
        </div>

      </body>
    </html>
  );
}
