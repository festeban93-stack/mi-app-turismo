import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Chat from "@/components/Chat";
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
  title: "Rutas del Pacífico",
  description:
    "App de turismo con mapa interactivo de destinos, playas y reservas naturales.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Chat />
      </body>
    </html>
  );
}
