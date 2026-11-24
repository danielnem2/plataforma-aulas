import { Box, Clapperboard, Gamepad2, MousePointerClick, Package, type LucideIcon } from "lucide-react";

export type TipoItem = "modelo_3d" | "template_botao" | "unitypack" | "animacao" | "horas_gaming";

export const ROTULO_TIPO: Record<TipoItem, string> = {
  modelo_3d: "Modelo 3D",
  template_botao: "Template de botão",
  unitypack: "UnityPack",
  animacao: "Animação",
  horas_gaming: "Horas na Gaming House",
};

export const ICONE_TIPO: Record<TipoItem, LucideIcon> = {
  modelo_3d: Box,
  template_botao: MousePointerClick,
  unitypack: Package,
  animacao: Clapperboard,
  horas_gaming: Gamepad2,
};

export const TIPOS_ITEM = Object.keys(ROTULO_TIPO) as TipoItem[];

/** URL pública de uma imagem da vitrine */
export function urlImagem(path: string | null) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/loja-imagens/${path}`;
}
