import { estiloInput } from "@/components/ui";

/** Campos do formulário "Enviar dúvida ao ADM" (usado na tela de Aulas) */
export function CamposRevisao({ aulaId }: { aulaId: string }) {
  return (
    <>
      <input type="hidden" name="aula_id" value={aulaId} />
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-medium text-texto-medio">De quem é a dúvida? *</legend>
        <label className="flex min-h-10 items-center gap-2 text-sm text-texto-medio">
          <input type="radio" name="tipo" value="duvida_professor" defaultChecked required /> Minha (sobre a atividade)
        </label>
        <label className="flex min-h-10 items-center gap-2 text-sm text-texto-medio">
          <input type="radio" name="tipo" value="duvida_aluno" /> De um aluno
        </label>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm font-medium text-texto-medio">
        Explique a dúvida *
        <textarea
          name="texto"
          required
          minLength={5}
          maxLength={4000}
          rows={4}
          placeholder="Ex.: no slide 5 o passo de importar o pacote não funciona na versão nova da Unity..."
          className={estiloInput}
        />
      </label>
    </>
  );
}
