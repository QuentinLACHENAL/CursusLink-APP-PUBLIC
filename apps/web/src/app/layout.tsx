import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ChatWidget from "../components/ChatWidget";
import { AuthProvider } from "../context/AuthContext";
import { GraphThemeProvider } from "../context/GraphThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CursusLink",
  description: "LMS Gamifié Peer-Learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <AuthProvider>
          <GraphThemeProvider>
            {children}
            <ChatWidget />
          </GraphThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
