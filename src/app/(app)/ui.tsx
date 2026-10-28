import Link from "next/link";
import { Icone, type NomeIcone } from "./icones";

// Peças visuais repetidas nas telas: título da página, cartões, botões e tabelas.

export function Cabecalho({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-slate-500">{subtitulo}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}

export const CLASSE_BOTAO =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-orange-700 disabled:opacity-60";
export const CLASSE_BOTAO_CLARO =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60";
export const CLASSE_CAMPO =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

export function BotaoLink({
  href,
  icone,
  claro,
  children,
}: {
  href: string;
  icone?: NomeIcone;
  claro?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={claro ? CLASSE_BOTAO_CLARO : CLASSE_BOTAO}>
      {icone && <Icone nome={icone} className="h-4 w-4" />}
      {children}
    </Link>
  );
}

export function Cartao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

// Número em destaque, como "Materiais cadastrados: 1.250".
export function CartaoNumero({ icone, rotulo, valor, texto }: { icone: NomeIcone; rotulo: string; valor: string; texto: string }) {
  return (
    <Cartao className="flex gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
        <Icone nome={icone} className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{rotulo}</p>
        <p className="text-2xl font-bold">{valor}</p>
        <p className="text-sm text-slate-500">{texto}</p>
      </div>
    </Cartao>
  );
}

export function Etiqueta({ cor, children }: { cor: "verde" | "cinza" | "laranja"; children: React.ReactNode }) {
  const cores = {
    verde: "bg-green-50 text-green-700 ring-green-200",
    cinza: "bg-slate-100 text-slate-600 ring-slate-200",
    laranja: "bg-orange-50 text-orange-700 ring-orange-200",
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cores[cor]}`}>{children}</span>;
}

export function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="p-8 text-center text-slate-500">{children}</p>;
}

export const CLASSE_TABELA = "w-full text-left text-sm";
export const CLASSE_TH = "border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500";
export const CLASSE_TD = "border-b border-slate-100 px-4 py-3";
