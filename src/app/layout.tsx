import type { Metadata } from "next";
import "./globals.css";
import {LanguageProvider} from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Pi | Tu próxima aventura en Costa Rica",
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
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
