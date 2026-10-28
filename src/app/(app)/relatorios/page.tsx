import Link from "next/link";
import { redirect } from "next/navigation";
import { listarObras } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { podeVerRelatorios } from "@/lib/movimentos";
import { exigirUsuario } from "@/lib/sessao";
import { Icone } from "../icones";
import { Cabecalho, Cartao, CLASSE_BOTAO, CLASSE_BOTAO_CLARO, CLASSE_CAMPO } from "../ui";
import { montarRelatorio, type FiltroRelatorio } from "./dados";

const DESCRICAO = {
  saldo: "Quanto tem de cada material em cada obra, com o custo médio e o valor total em estoque.",
  consumo: "Quanto de cada material saiu no período, por obra e por etapa/serviço, com o valor consumido.",
};

const ABAS = [
  { tipo: "saldo", rotulo: "Saldo por obra", icone: "estoque" as const },
  { tipo: "consumo", rotulo: "Consumo por período", icone: "saida" as const },
];

// Relatórios para o escritório: saldo por obra e consumo por período, em PDF ou Excel.
export default async function Relatorios({ searchParams }: { searchParams: Promise<FiltroRelatorio> }) {
  const usuario = await exigirUsuario();
  if (!podeVerRelatorios(usuario.perfil)) redirect("/");
  const filtro = await searchParams;
  const obras = listarObras(banco());
  const r = montarRelatorio(banco(), obras, filtro);

  return (
    <>
      <Cabecalho titulo="Relatórios" subtitulo="Escolha o relatório, a obra e o período." />

      <nav className="mb-4 flex gap-2 overflow-x-auto">
        {ABAS.map((a) => (
          <Link
            key={a.tipo}
            href={`/relatorios?tipo=${a.tipo}&obra=${r.obra}`}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
              r.tipo === a.tipo ? "bg-marca-600 text-white shadow-sm" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Icone nome={a.icone} className={`h-4 w-4 ${r.tipo === a.tipo ? "text-destaque-400" : ""}`} />
            {a.rotulo}
          </Link>
        ))}
      </nav>

      <Cartao className="p-5">
        <p className="mb-4 text-sm text-slate-600">{DESCRICAO[r.tipo]}</p>
        {/* "Ver relatório" abre o PDF numa aba nova; "Baixar Excel" usa os mesmos filtros. */}
        <form action="/relatorios/pdf" target="_blank" className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <input type="hidden" name="tipo" value={r.tipo} />
          <label className="block">
            <span className="text-sm font-medium">Obra</span>
            <select name="obra" defaultValue={r.obra} className={CLASSE_CAMPO}>
              <option value="todas">Todas as obras</option>
              {obras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                  {o.encerrada_em ? " (encerrada)" : ""}
                </option>
              ))}
            </select>
          </label>
          {r.tipo === "consumo" && (
            <>
              <label className="block">
                <span className="text-sm font-medium">De</span>
                <input type="date" name="de" defaultValue={r.de} required className={CLASSE_CAMPO} />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Até</span>
                <input type="date" name="ate" defaultValue={r.ate} required className={CLASSE_CAMPO} />
              </label>
            </>
          )}
          <div className="flex flex-col gap-2 sm:col-span-full sm:flex-row sm:justify-end">
            <button formAction="/relatorios/excel" formTarget="_self" className={CLASSE_BOTAO_CLARO}>
              <Icone nome="baixar" className="h-4 w-4" /> Baixar Excel
            </button>
            <button className={`${CLASSE_BOTAO} py-3 text-lg`}>
              <Icone nome="relatorio" className="h-5 w-5 text-destaque-400" /> Ver relatório
            </button>
          </div>
        </form>
      </Cartao>
      <p className="mt-3 text-sm text-slate-500">O relatório abre em PDF numa nova aba, pronto para imprimir ou enviar.</p>
    </>
  );
}
