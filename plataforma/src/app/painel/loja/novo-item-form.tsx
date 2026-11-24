"use client";

import { useRef, useState } from "react";
import { botao, Campo, estiloInput } from "@/components/ui";
import { ROTULO_TIPO, TIPOS_ITEM, type TipoItem } from "@/lib/loja";
import { createClient } from "@/lib/supabase/client";
import { criarItemLoja } from "./actions";

/** Nome de arquivo seguro para o Storage */
const limparNome = (nome: string) =>
  nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

/**
 * Formulário de novo item. Os arquivos sobem direto do navegador para o
 * Supabase Storage (sem limite de tamanho do servidor); depois o item é salvo.
 */
export function NovoItemForm({
  escolas,
  escolaFixa,
}: {
  escolas: { id: string; nome: string }[];
  escolaFixa: string | null;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [tipo, setTipo] = useState<TipoItem>("modelo_3d");
  const [status, setStatus] = useState<{ erro?: string; ok?: string; enviando?: string }>({});

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const escolaId = escolaFixa ?? String(f.get("escola_id") ?? "");
    if (!escolaId) return setStatus({ erro: "Escolha a escola." });

    const supabase = createClient();
    const subir = async (bucket: string, arquivo: File | null) => {
      if (!arquivo || !arquivo.size) return null;
      const caminho = `${escolaId}/${crypto.randomUUID()}-${limparNome(arquivo.name)}`;
      const { error } = await supabase.storage.from(bucket).upload(caminho, arquivo);
      if (error) throw new Error(`Falha ao enviar ${arquivo.name}: ${error.message}`);
      return caminho;
    };

    try {
      setStatus({ enviando: "Enviando arquivos..." });
      const imagem_path = await subir("loja-imagens", f.get("imagem") as File | null);
      const arquivo_path = tipo === "horas_gaming" ? null : await subir("loja-arquivos", f.get("arquivo") as File | null);

      setStatus({ enviando: "Salvando item..." });
      const r = await criarItemLoja({
        escola_id: escolaId,
        nome: String(f.get("nome") ?? ""),
        descricao: String(f.get("descricao") ?? ""),
        tipo,
        preco_gold: Number(f.get("preco_gold") ?? 0),
        horas: tipo === "horas_gaming" ? Number(f.get("horas") ?? 0) : null,
        imagem_path,
        arquivo_path,
      });
      setStatus(r);
      if (r.ok) {
        ref.current?.reset();
        setTipo("modelo_3d");
      }
    } catch (err) {
      setStatus({ erro: (err as Error).message });
    }
  }

  return (
    <form ref={ref} onSubmit={enviar} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        {!escolaFixa && (
          <Campo rotulo="Escola *">
            <select name="escola_id" defaultValue="" required className={estiloInput}>
              <option value="" disabled>Selecione...</option>
              {escolas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </Campo>
        )}
        <Campo rotulo="Tipo *">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoItem)} className={estiloInput}>
            {TIPOS_ITEM.map((t) => (
              <option key={t} value={t}>{ROTULO_TIPO[t]}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Nome *">
          <input name="nome" required className={estiloInput} />
        </Campo>
        <Campo rotulo="Preço em Gold *">
          <input name="preco_gold" type="number" min={1} required className={estiloInput} />
        </Campo>
        {tipo === "horas_gaming" ? (
          <Campo rotulo="Horas de jogo *">
            <input name="horas" type="number" min={0.5} step={0.5} required className={estiloInput} />
          </Campo>
        ) : (
          <Campo rotulo="Arquivo do item * (.fbx, .unitypackage, .zip...)">
            <input name="arquivo" type="file" required className="text-sm text-texto-medio" />
          </Campo>
        )}
        <Campo rotulo="Imagem da vitrine">
          <input name="imagem" type="file" accept="image/*" className="text-sm text-texto-medio" />
        </Campo>
      </div>
      <Campo rotulo="Descrição">
        <textarea name="descricao" rows={2} className={estiloInput} />
      </Campo>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!!status.enviando}
          className={botao("primario")}
        >
          {status.enviando ?? "Criar item"}
        </button>
        {status.erro && <span role="alert" className="text-sm text-perigo">{status.erro}</span>}
        {status.ok && <span className="text-sm text-sucesso">{status.ok}</span>}
      </div>
    </form>
  );
}
