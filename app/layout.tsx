import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTRAKS ORIENTE - Control de Herramientas",
  description: "Sistema Integrado de Control de Herramientas para Concesionarios Automotrices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
