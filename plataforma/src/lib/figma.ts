/**
 * Aceita o que o professor colar do Figma e devolve uma URL de embed válida:
 * - bloco <iframe ... src="https://embed.figma.com/...">
 * - URL https://embed.figma.com/...
 * - link de compartilhamento https://www.figma.com/{proto|design|slides|deck|board}/...
 *   (convertido para embed.figma.com)
 * Retorna null se não reconhecer.
 */
export function normalizarFigma(entrada: string): string | null {
  let texto = entrada.trim();
  const src = texto.match(/src=["']([^"']+)["']/i);
  if (src) texto = src[1];

  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  if (url.hostname === "embed.figma.com") {
    if (!url.searchParams.has("embed-host")) url.searchParams.set("embed-host", "share");
    return url.toString();
  }

  if (
    (url.hostname === "www.figma.com" || url.hostname === "figma.com") &&
    /^\/(proto|design|file|slides|deck|board)\//.test(url.pathname)
  ) {
    url.hostname = "embed.figma.com";
    url.pathname = url.pathname.replace(/^\/file\//, "/design/");
    url.searchParams.set("embed-host", "share");
    return url.toString();
  }

  return null;
}
