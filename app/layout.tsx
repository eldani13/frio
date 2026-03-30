import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// --- IMPORTA TU NUEVO AUTH PROVIDER ---
import { AuthProvider } from "./context/AuthContext"; 
import { BodegaHistoryProvider } from "./components/BodegaDashboard/BodegaHistoryContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bodega App",
  description: "Gestión profesional de bodegas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* --- ENVUELVE TODO CON AUTHPROVIDER --- */}
        <AuthProvider>
          <BodegaHistoryProvider>
            {children}
          </BodegaHistoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}