import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import ModeToggle from "@/components/ui/ModeToggle";
import LogoutButton from "@/components/ui/LogoutButton";
import NotificationBadge from "@/components/ui/NotificationBadge";
import NavLinks from "@/components/ui/NavLinks";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Connexus — UST Student Collaboration Matcher",
  description:
    "Find your ideal project collaborator at UST. Connexus matches students by course, skills, interests, and project needs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider>
          <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/80">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              {/* Wordmark */}
              <a
                href="/"
                className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
                aria-label="Connexus home"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "#7C3AED" }}
                  aria-hidden="true"
                />
                <span className="text-base font-bold tracking-tight text-gray-900 dark:text-gray-50">
                  Connexus
                </span>
              </a>

              {/* Right side nav */}
              <div className="flex items-center gap-1">
                <NavLinks />
                <ModeToggle />
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <footer className="border-t border-gray-200 py-6 dark:border-gray-800">
            <p className="text-center text-xs text-gray-400 dark:text-gray-600">
              © {new Date().getFullYear()} Connexus · University of Santo Tomas
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}