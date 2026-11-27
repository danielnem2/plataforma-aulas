"use client";

import { CircleAlert, CircleCheck, ImageUp, LoaderCircle, Palette, Trash2 } from "lucide-react";
import { useState } from "react";
import { botao, Campo, estiloInput, Icone } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { contraste, urlLogo, type TemaEscola } from "@/lib/tema-escola";
import { salvarTemaEscola } from "./actions";

const limparNome = (nome: string) =>
  nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

/** Tema da escola: o logo sobe direto do navegador para o Storage; depois o tema é salvo */
export function TemaForm({ escolaId, tema }: { escolaId: string; tema: TemaEscola }) {
  const [cor, setCor] = useState(tema.tema_cor ?? "");
  const [fundo, setFundo] = useState(tema.tema_fundo);
  const [modo, setModo] = useState(tema.tema_modo);
  const [nome, setNome] = useState(tema.tema_nome ?? "");
  const [logoPath, setLogoPath] = useState(tema.logo_path);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [status, setStatus] = useState<{ erro?: string; ok?: string; enviando?: boolean }>({});

  const corValida = /^#[0-9a-fA-F]{6}$/.test(cor);
  const previa = arquivo ? URL.createObjectURL(arquivo) : urlLogo(logoPath);
  const fundoPrevia = modo === "escuro" ? (fundo === "preto_branco" ? "#0a0a0a" : "#1e1e1e") : fundo === "preto_branco" ? "#ffffff" : "#fbfaf6";
  const textoPrevia = modo === "escuro" ? "#f9f7f4" : "#111111";

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ enviando: true });
    try {
      let novoLogo: string | null | undefined = undefined;
      if (arquivo) {
        if (arquivo.size > 2 * 1024 * 1024) throw new Error("O logo precisa ter no máximo 2 MB.");
        const caminho = `${escolaId}/${crypto.randomUUID()}-${limparNome(arquivo.name)}`;
        const { error } = await createClient().storage.from("escolas-logos").upload(caminho, arquivo);
        if (error) throw new Error(`Falha ao enviar o logo: ${error.message}`);
        novoLogo = caminho;
      } else if (logoPath !== tema.logo_path) {
        novoLogo = logoPath; // removeu o logo
      }
      const r = await salvarTemaEscola({
        id: escolaId,
        tema_cor: corValida ? cor : null,
        tema_fundo: fundo,
        tema_modo: modo,
        tema_nome: nome,
        logo_path: novoLogo,
      });
      if (r.ok && novoLogo !== undefined) {
        setLogoPath(novoLogo);
        setArquivo(null);
      }
      setStatus(r);
    } catch (err) {
      setStatus({ erro: (err as Error).message });
    }
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Nome exibido no topo (opcional)">
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={60} placeholder="Ex.: Fire Games" className={estiloInput} />
        </Campo>
        <Campo rotulo="Cor da marca (vazio = cor padrão da plataforma)">
          <span className="flex gap-2">
            <input
              type="color"
              value={corValida ? cor : "#3b6788"}
              onChange={(e) => setCor(e.target.value)}
              aria-label="Escolher cor"
              className="h-10 w-14 cursor-pointer rounded-lg border border-borda-forte bg-superficie"
            />
            <input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="#ff4e00" maxLength={7} className={`${estiloInput} flex-1`} />
          </span>
        </Campo>
        <Campo rotulo="Estilo do fundo">
          <select value={fundo} onChange={(e) => setFundo(e.target.value as TemaEscola["tema_fundo"])} className={estiloInput}>
            <option value="padrao">Padrão da plataforma (papel / cinza)</option>
            <option value="preto_branco">Preto e branco</option>
          </select>
        </Campo>
        <Campo rotulo="Modo padrão (cada pessoa ainda pode trocar no topo)">
          <select value={modo} onChange={(e) => setModo(e.target.value as TemaEscola["tema_modo"])} className={estiloInput}>
            <option value="claro">Claro</option>
            <option value="escuro">Escuro</option>
          </select>
        </Campo>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <Campo rotulo="Logo (PNG/SVG com fundo transparente, até 2 MB)">
          <input
            type="file"
            accept="image/png,image/svg+xml,image/webp,image/jpeg"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="text-sm text-texto-medio file:mr-3 file:min-h-10 file:rounded-lg file:border file:border-borda-forte file:bg-superficie file:px-3 file:text-texto"
          />
        </Campo>
        {logoPath && !arquivo && (
          <button type="button" onClick={() => setLogoPath(null)} className={botao("perigo", "pequeno")}>
            <Icone icone={Trash2} tamanho={16} /> Remover logo
          </button>
        )}
      </div>

      {/* Prévia: topo da plataforma com o tema */}
      <div className="rounded-xl border border-borda p-4" style={{ background: fundoPrevia, color: textoPrevia }}>
        <p className="mb-3 text-xs opacity-80">Prévia ({modo === "escuro" ? "modo escuro" : "modo claro"})</p>
        <div className="flex flex-wrap items-center gap-4">
          {previa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previa} alt="Prévia do logo" className="h-10 w-auto max-w-48 object-contain" />
          ) : (
            <span className="font-bold">{nome || "Nome da escola"}</span>
          )}
          {corValida && (
            <>
              <span
                className="rounded-lg px-4 py-2 text-sm font-semibold"
                style={{ background: cor, color: contraste("#0a0a0a", cor) >= contraste("#ffffff", cor) ? "#0a0a0a" : "#ffffff" }}
              >
                Botão
              </span>
              <span className="font-semibold" style={{ color: cor }}>
                Destaque
              </span>
            </>
          )}
        </div>
        {corValida && (
          <p className="mt-3 text-xs opacity-80">
            Os tons de texto e link são ajustados automaticamente para manter a leitura confortável (contraste AA).
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={status.enviando} className={botao("primario")}>
          <Icone icone={status.enviando ? LoaderCircle : arquivo ? ImageUp : Palette} className={status.enviando ? "animate-spin" : ""} />
          {status.enviando ? "Salvando..." : "Salvar tema"}
        </button>
        <span aria-live="polite" className="contents">
          {status.erro && (
            <span role="alert" className="inline-flex items-center gap-1.5 text-sm font-medium text-perigo">
              <Icone icone={CircleAlert} tamanho={16} /> {status.erro}
            </span>
          )}
          {status.ok && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sucesso">
              <Icone icone={CircleCheck} tamanho={16} /> {status.ok}
            </span>
          )}
        </span>
      </div>
    </form>
  );
}
