"use client";

/** Tipos da API Document Picture-in-Picture (Edge/Chrome 116+) */
declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(opcoes?: { width?: number; height?: number }): Promise<Window>;
      window: Window | null;
    };
  }
}

export const suportaJanelaFlutuante = () =>
  typeof window !== "undefined" && "documentPictureInPicture" in window;

/**
 * Abre a aula numa janela que fica sempre por cima (RF25).
 * Edge/Chrome: Document Picture-in-Picture. Outros navegadores: popup comum.
 * Precisa ser chamada a partir de um clique do usuário.
 */
export async function abrirJanelaFlutuante(url: string, titulo: string) {
  if (!window.documentPictureInPicture) {
    window.open(url, "aula-flutuante", "width=640,height=400");
    return;
  }

  // só uma janela por vez: fecha a anterior
  window.documentPictureInPicture.window?.close();

  const pip = await window.documentPictureInPicture.requestWindow({ width: 640, height: 400 });
  pip.document.title = titulo;
  const estilo = pip.document.createElement("style");
  estilo.textContent = "html,body{margin:0;height:100%;background:#273041}iframe{border:0;width:100%;height:100%}";
  pip.document.head.append(estilo);

  const iframe = pip.document.createElement("iframe");
  iframe.src = url;
  iframe.allowFullscreen = true;
  iframe.title = titulo;
  pip.document.body.append(iframe);
}
