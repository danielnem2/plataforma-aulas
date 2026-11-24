import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Plataforma de Aulas", template: "%s · Plataforma de Aulas" },
  description: "Plataforma de aprendizado gamificada",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
