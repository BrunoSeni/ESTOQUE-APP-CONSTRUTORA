"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { trocarObraAcao } from "./acoes";
import { Icone, type NomeIcone } from "./icones";

type Item = { href: string; rotulo: string; icone: NomeIcone };

// Menu da esquerda: logo, obra atual, páginas e quem está conectado.
// No celular ele fica escondido e abre pelo botão de menu no topo.
export function MenuLateral({
  itens,
  obras,
  obraAtualId,
  usuario,
  podeCadastrarObra,
  sair,
}: {
  itens: Item[];
  obras: { id: number; nome: string }[];
  obraAtualId: number | null;
  usuario: { nome: string; perfil: string };
  podeCadastrarObra: boolean;
  sair: () => Promise<void>;
}) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const [trocando, iniciar] = useTransition();

  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  const conteudo = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
          <Icone nome="material" className="h-6 w-6" />
        </span>
        <div>
          <p className="font-bold leading-tight text-orange-600">Estoque da Obra</p>
          <p className="text-xs text-slate-500">Controle de material</p>
        </div>
      </div>

      <div className="border-b border-slate-200 px-5 py-4">
        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500" htmlFor="obra-atual">
          <Icone nome="obra" className="h-4 w-4" /> Obra atual
        </label>
        {obras.length > 0 ? (
          <select
            id="obra-atual"
            value={obraAtualId ?? ""}
            disabled={trocando}
            onChange={(e) => {
              const id = Number(e.target.value);
              iniciar(() => trocarObraAcao(id));
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          >
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        ) : (
          <p className="mt-1.5 text-sm text-slate-500">
            Nenhuma obra.{" "}
            {podeCadastrarObra && (
              <Link href="/obras/nova" className="font-medium text-orange-600 underline" onClick={() => setAberto(false)}>
                Cadastrar
              </Link>
            )}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {itens.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            onClick={() => setAberto(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              ativo(i.href) ? "bg-orange-600 text-white shadow-sm" : "text-slate-700 hover:bg-orange-50 hover:text-orange-700"
            }`}
          >
            <Icone nome={i.icone} />
            {i.rotulo}
          </Link>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <p className="truncate text-sm font-semibold">{usuario.nome}</p>
        <p className="truncate text-xs text-slate-500">{usuario.perfil}</p>
        <form action={sair} className="mt-3">
          <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            <Icone nome="sair" className="h-4 w-4" /> Sair
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Barra do topo no celular */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <button onClick={() => setAberto(true)} aria-label="Abrir menu" className="rounded-lg p-1.5 hover:bg-slate-100">
          <Icone nome="menu" className="h-6 w-6" />
        </button>
        <span className="font-bold text-orange-600">Estoque da Obra</span>
        <span className="ml-auto truncate text-sm text-slate-500">{obras.find((o) => o.id === obraAtualId)?.nome}</span>
      </div>

      {/* Menu fixo no computador */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">{conteudo}</aside>

      {/* Menu por cima da tela no celular */}
      {aberto && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-xl">
            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 rounded-lg p-1.5 hover:bg-slate-100"
            >
              <Icone nome="fechar" />
            </button>
            {conteudo}
          </aside>
        </div>
      )}
    </>
  );
}
