import Link from "next/link";
import { contarMateriais, listarObras, listarUsuarios } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { exigirUsuario, obraAtual } from "@/lib/sessao";
import { Icone, type NomeIcone } from "./icones";
import { Cabecalho, Cartao, CartaoNumero } from "./ui";

// Atalhos das próximas etapas. Os botões são grandes para usar no celular, no canteiro.
const ATALHOS: { titulo: string; texto: string; icone: NomeIcone }[] = [
  { titulo: "Entrada", texto: "Material que chegou na obra", icone: "entrada" },
  { titulo: "Saída", texto: "Material usado na obra", icone: "saida" },
  { titulo: "Transferência", texto: "Mandar material para outra obra", icone: "transferencia" },
  { titulo: "Saldo", texto: "Quanto tem de cada material", icone: "material" },
  { titulo: "Histórico", texto: "Todas as movimentações", icone: "historico" },
  { titulo: "Relatórios", texto: "Saldo, histórico e consumo em Excel", icone: "relatorio" },
];

export default async function Inicio() {
  const usuario = await exigirUsuario();
  const { atual } = await obraAtual(usuario);
  const db = banco();
  const admin = usuario.perfil === "admin";

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

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Em breve</h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ATALHOS.map((a) => (
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
