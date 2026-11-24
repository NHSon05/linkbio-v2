import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Geist_Mono, Sora } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "bio-link dashboard",
  description: "Quản trị landing page link-in-bio: template, layout, theme, preview.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${geistMono.variable} ${sora.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
