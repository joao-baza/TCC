import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DCOU | Laboratório Digital de Operações Unitárias",
  description:
    "Ferramenta didática para docentes e discentes da Engenharia Química com simulações, apoio visual e recursos de estudo."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
