import Link from "next/link";
import { redirect } from "next/navigation";
import { listarObras } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { formatarQuantidade } from "@/lib/estoque";
import { podeVerRelatorios } from "@/lib/movimentos";
import { exigirUsuario } from "@/lib/sessao";
import { Icone } from "../icones";
import { Cabecalho, Cartao, CLASSE_BOTAO, CLASSE_CAMPO, CLASSE_TABELA, CLASSE_TD, CLASSE_TH, Vazio } from "../ui";
import { montarRelatorio, type FiltroRelatorio } from "./dados";

const ABAS = [
  { tipo: "saldo", rotulo: "Saldo por obra", icone: "estoque" as const },
  { tipo: "consumo", rotulo: "Consumo por período", icone: "saida" as const },
];

// Relatórios para o escritório: saldo por obra e consumo por período, com download em Excel.
export default async function Relatorios({ searchParams }: { searchParams: Promise<FiltroRelatorio> }) {
  const usuario = await exigirUsuario();
  if (!podeVerRelatorios(usuario.perfil)) redirect("/");
  const filtro = await searchParams;
  const obras = listarObras(banco());
  const r = montarRelatorio(banco(), obras, filtro);
  const parametros = new URLSearchParams({ tipo: r.tipo, obra: r.obra, ...(r.tipo === "consumo" ? { de: r.de, ate: r.ate } : {}) });

  return (
    <>
      <Cabecalho titulo="Relatórios" subtitulo="Escolha o relatório e baixe em Excel quando precisar." />

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

      <Cartao className="mb-4 p-4">
        <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
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
          <button className={`${CLASSE_BOTAO} sm:col-start-4`}>Ver relatório</button>
        </form>
      </Cartao>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{r.titulo}</h2>
        {r.linhas.length > 0 && (
          <a href={`/relatorios/excel?${parametros}`} className={CLASSE_BOTAO} download>
            <Icone nome="baixar" className="h-4 w-4" /> Baixar Excel
          </a>
        )}
      </div>

      <Cartao className="overflow-x-auto">
        {r.linhas.length === 0 ? (
          <Vazio>
            {r.tipo === "saldo"
              ? "Nenhum material com saldo nessa obra."
              : "Nenhuma saída de material nesse período."}
          </Vazio>
        ) : (
          <table className={CLASSE_TABELA}>
            <thead>
              <tr>
                {r.colunas.map((c, i) => (
                  <th key={c} className={`${CLASSE_TH} ${r.numericas.includes(i) ? "text-right" : ""}`}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.linhas.map((l, i) => (
                <tr key={i} className="hover:bg-marca-50/40">
                  {l.map((v, j) => (
                    <td
                      key={j}
                      className={`${CLASSE_TD} ${r.numericas.includes(j) ? "text-right tabular-nums font-semibold" : ""}`}
                    >
                      {typeof v === "number" ? formatarQuantidade(v) : v || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
      {r.linhas.length > 0 && (
        <p className="mt-3 text-sm text-slate-500">{r.linhas.length.toLocaleString("pt-BR")} linhas.</p>
      )}
    </>
  );
}
