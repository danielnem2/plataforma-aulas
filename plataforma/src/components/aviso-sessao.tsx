"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Icone } from "@/components/ui";
import { DURACAO_SESSAO_MS } from "@/lib/supabase/config";

const AVISAR_ANTES_MS = 10 * 60 * 1000;

/** Avisa 10 min antes da sessão de 2h expirar e manda para o login quando expira (RF81) */
export function AvisoSessao({ loginEm }: { loginEm: string | null }) {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    if (!loginEm) return;
    const fim = new Date(loginEm).getTime() + DURACAO_SESSAO_MS;
    const tick = () => {
      const r = fim - Date.now();
      if (r <= 0) {
        window.location.href = "/login?expirada=1";
        return;
      }
      setRestante(r);
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [loginEm]);

  if (restante === null || restante > AVISAR_ANTES_MS) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-aviso-suave px-3 py-1 font-medium text-aviso" role="status">
      <Icone icone={Clock} tamanho={16} />
      Sessão expira em {Math.ceil(restante / 60000)} min — salve seu trabalho
    </span>
  );
}
