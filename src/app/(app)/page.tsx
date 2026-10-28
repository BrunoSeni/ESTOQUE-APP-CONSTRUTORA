import Link from "next/link";
import type { Perfil } from "@/lib/auth";
import { contarMateriais, listarObras, listarUsuarios } from "@/lib/cadastros";
import { banco, PASTA_IMAGENS_OBRAS } from "@/lib/db";
import { imagensDaObra } from "@/lib/imagens-obra";
import { podeLancar, podeVerRelatorios } from "@/lib/movimentos";
import { exigirUsuario, obraAtual } from "@/lib/sessao";
import { Icone, type NomeIcone } from "./icones";
import { Cabecalho, Cartao, CartaoNumero } from "./ui";

// Atalhos das telas. Os botões são grandes para usar no celular, no canteiro.
type Atalho = { titulo: string; texto: string; icone: NomeIcone; href?: string };

function atalhos(perfil: Perfil): { prontos: (Atalho & { href: string })[]; emBreve: Atalho[] } {
  const prontos: (Atalho & { href: string })[] = [
    ...(podeLancar(perfil)
      ? [
          { titulo: "Entrada", texto: "Material que chegou na obra", icone: "entrada" as const, href: "/entrada" },
          { titulo: "Saída", texto: "Material usado na obra", icone: "saida" as const, href: "/saida" },
        ]
      : []),
    { titulo: "Saldo", texto: "Quanto tem de cada material", icone: "estoque", href: "/saldo" },
    ...(podeVerRelatorios(perfil)
      ? [{ titulo: "Relatórios", texto: "Saldo e consumo, em PDF e Excel", icone: "relatorio" as const, href: "/relatorios" }]
      : []),
  ];
  const emBreve: Atalho[] = [
    { titulo: "Transferência", texto: "Mandar material para outra obra", icone: "transferencia" },
    { titulo: "Histórico", texto: "Todas as movimentações", icone: "historico" },
  ];
  return { prontos, emBreve };
}

export default async function Inicio() {
  const usuario = await exigirUsuario();
  const { atual } = await obraAtual(usuario);
  const db = banco();
  const admin = usuario.perfil === "admin";
  const { prontos, emBreve } = atalhos(usuario.perfil);
  const imagens = atual ? imagensDaObra(PASTA_IMAGENS_OBRAS, atual.id) : null;

  const obrasAtivas = listarObras(db).filter((o) => !o.encerrada_em).length;
  const materiais = contarMateriais(db);
  const usuarios = listarUsuarios(db).filter((u) => u.ativo).length;

  const passos = [
    { feito: obrasAtivas > 0, texto: "Cadastre as obras", href: "/obras/nova" },
    { feito: materiais > 0, texto: "Importe a planilha de materiais", href: "/materiais/importar" },
    { feito: usuarios > 1, texto: "Cadastre as pessoas da equipe", href: "/usuarios/novo" },
  ];

  return (
    <>
      <Cabecalho titulo={`Olá, ${usuario.nome.split(" ")[0]}`} subtitulo={atual ? `Obra atual: ${atual.nome}` : "Nenhuma obra escolhida."} />

      {atual && imagens && (imagens.fachada || imagens.logo) && (
        <section className="relative mb-6 h-44 overflow-hidden rounded-xl bg-marca-800 shadow-sm sm:h-56">
          {imagens.fachada && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagens.fachada} alt={`Fachada da obra ${atual.nome}`} className="absolute inset-0 h-full w-full object-cover object-[50%_35%]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-4 p-4 sm:p-5">
            {imagens.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagens.logo} alt={`Logo da obra ${atual.nome}`} className="h-16 w-16 shrink-0 rounded-lg object-cover shadow-lg ring-2 ring-white/80 sm:h-20 sm:w-20" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-destaque-400">Obra atual</p>
              <p className="truncate text-xl font-bold text-white sm:text-2xl">{atual.nome}</p>
              {atual.endereco && <p className="truncate text-sm text-slate-200">{atual.endereco}</p>}
            </div>
          </div>
        </section>
      )}

      <div className={`mb-6 grid gap-3 ${admin ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <CartaoNumero icone="obra" rotulo="Obras em andamento" valor={String(obrasAtivas)} texto="com estoque próprio" />
        <CartaoNumero icone="material" rotulo="Materiais" valor={materiais.toLocaleString("pt-BR")} texto="cadastrados" />
        {admin && <CartaoNumero icone="usuarios" rotulo="Usuários" valor={String(usuarios)} texto="com acesso ativo" />}
      </div>

      {admin && passos.some((p) => !p.feito) && (
        <Cartao className="mb-6 p-5">
          <h2 className="font-semibold">Primeiros passos</h2>
          <ol className="mt-3 space-y-2">
            {passos.map((p, i) => (
              <li key={p.href} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    p.feito ? "bg-green-100 text-green-700" : "bg-destaque-100 text-destaque-700"
                  }`}
                >
                  {p.feito ? "✓" : i + 1}
                </span>
                {p.feito ? (
                  <span className="text-slate-400 line-through">{p.texto}</span>
                ) : (
                  <Link href={p.href} className="font-medium text-marca-700 hover:underline">
                    {p.texto}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </Cartao>
      )}

      <ul className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {prontos.map((a) => (
          <li key={a.titulo}>
            <Link
              href={a.href}
              className="group flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-marca-300 hover:bg-marca-50"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-marca-600 text-destaque-400 group-hover:bg-marca-700">
                <Icone nome={a.icone} className="h-6 w-6" />
              </span>
              <span>
                <span className="block text-lg font-semibold">{a.titulo}</span>
                <span className="block text-sm text-slate-500">{a.texto}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Em breve</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {emBreve.map((a) => (
          <li key={a.titulo}>
            <Cartao className="flex gap-3 p-5 opacity-75">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Icone nome={a.icone} />
              </span>
              <div>
                <p className="font-semibold">{a.titulo}</p>
                <p className="text-sm text-slate-500">{a.texto}</p>
              </div>
            </Cartao>
          </li>
        ))}
      </ul>
    </>
  );
}
