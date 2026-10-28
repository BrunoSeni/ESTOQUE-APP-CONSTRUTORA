import type { Metadata, Viewport } from "next";
import "./globals.css";

// Todas as telas leem o banco na hora do acesso, nunca na montagem do app.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Estoque da Obra",
  description: "Controle de estoque de material das obras",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
