import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Lexend: fonte criada para facilitar a leitura (boa para TDAH e dislexia)
const lexend = Lexend({ subsets: ["latin"], variable: "--fonte-lexend", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Plataforma de Aulas", template: "%s · Plataforma de Aulas" },
  description: "Plataforma de aprendizado gamificada",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: o script abaixo pode pôr data-tema antes do React carregar
    <html lang="pt-BR" className={`h-full antialiased ${lexend.variable}`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-fundo font-sans text-texto">
        {/* aplica o tema escolhido antes de pintar a tela (sem "piscar" branco no modo escuro) */}
        <Script id="tema" strategy="beforeInteractive">
          {`try{if(localStorage.getItem("tema")==="escuro")document.documentElement.dataset.tema="escuro"}catch(e){}`}
        </Script>
        <a
          href="#conteudo"
          className="sr-only rounded-lg bg-primaria px-4 py-2 font-semibold text-sobre-primaria focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
