import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "ChessPlatform — Play Chess Online",
  description: "Play real-time chess online. Matchmaking, ratings, and more.",
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
