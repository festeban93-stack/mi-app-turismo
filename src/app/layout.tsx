import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MapAI Costa Rica | Exploración e Itinerarios Inteligentes",
  description: "Descubre gemas ocultas, itinerarios personalizados y mapas interactivos en Costa Rica impulsados por Inteligencia Artificial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-900 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
