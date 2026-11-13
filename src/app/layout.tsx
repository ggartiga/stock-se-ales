import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "STOCK SEÑALES", template: "%s · STOCK SEÑALES" },
  description: "Gestión y control de inventario del área de Señales",
  applicationName: "STOCK SEÑALES",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icono.svg", apple: "/icono.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f25c0f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
