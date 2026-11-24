import { BookOpenCheck, Briefcase, GraduationCap, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Papel } from "@/lib/supabase/config";

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: "Admin",
  diretor: "Coordenador",
  professor: "Professor",
  aluno: "Aluno",
};

export const ICONE_PAPEL: Record<Papel, LucideIcon> = {
  admin: ShieldCheck,
  diretor: Briefcase,
  professor: BookOpenCheck,
  aluno: GraduationCap,
};

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const ROTULO_PERIODO = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
} as const;

export type Periodo = keyof typeof ROTULO_PERIODO;

/** "19:30:00" -> "19:30" */
export const hora = (t: string | null) => (t ? t.slice(0, 5) : "");
