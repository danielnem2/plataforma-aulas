/** Peças visuais simples do painel (funcionam em Server e Client Components) */

export const estiloInput =
  "rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-base text-slate-100 outline-none focus:border-cyan-400";

export function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-slate-300">
      {rotulo}
      {children}
    </label>
  );
}

export function Cartao({
  titulo,
  children,
}: {
  titulo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
      {titulo && <h2 className="mb-4 text-lg font-semibold text-slate-100">{titulo}</h2>}
      {children}
    </section>
  );
}

export function Selo({
  ativo,
  sim = "Ativa",
  nao = "Inativa",
}: {
  ativo: boolean;
  sim?: string;
  nao?: string;
}) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${
        ativo ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/20 text-slate-400"
      }`}
    >
      {ativo ? sim : nao}
    </span>
  );
}

/** Bloco "Editar" que abre/fecha sem JavaScript */
export function Expansivel({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm text-cyan-300 hover:underline">
        {rotulo}
      </summary>
      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 p-4">{children}</div>
    </details>
  );
}
