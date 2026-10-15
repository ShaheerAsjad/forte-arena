import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import { Toaster } from "sonner";
import { APP_NAME, APP_DESCRIPTION } from "@/config/app";
import { ScrollProgressBar } from "@/components/shared/ScrollProgressBar";
import { BackToTop } from "@/components/shared/BackToTop";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-ivory text-ink">
        <ScrollProgressBar />
        {children}
        <BackToTop />
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            className: "font-sans rounded-2xl border border-navy-100/80 shadow-xl",
          }}
        />
      </body>
    </html>
  );
}
