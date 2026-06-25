import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ChessPlatform — Play Chess Online",
  description: "Play real-time chess online. Matchmaking, ratings, and more.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom but stop the board drag from triggering scroll/zoom.
  maximumScale: 1,
  userScalable: false,
  themeColor: "#262421",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-56px)]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
