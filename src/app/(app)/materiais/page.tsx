import Link from "next/link";
import { contarMateriais, listarMateriais } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { exigirUsuario } from "@/lib/sessao";
import { Icone } from "../icones";
import { BotaoLink, Cabecalho, Cartao, CLASSE_BOTAO, CLASSE_TABELA, CLASSE_TD, CLASSE_TH, Etiqueta, Vazio } from "../ui";

export default async function Materiais({ searchParams }: { searchParams: Promise<{ busca?: string; inativos?: string }> }) {
  const usuario = await exigirUsuario();
  const admin = usuario.perfil === "admin";
  const { busca = "", inativos } = await searchParams;
  const db = banco();
  const { materiais, total } = listarMateriais(db, { busca, incluirInativos: admin && inativos === "1" });

  return (
    <>
      <Cabecalho titulo="Materiais" subtitulo={`${contarMateriais(db).toLocaleString("pt-BR")} materiais cadastrados, iguais para todas as obras.`}>
        {admin && (
          <>
            <BotaoLink href="/materiais/importar" icone="importar" claro>
              Importar planilha
            </BotaoLink>
            <BotaoLink href="/materiais/novo" icone="mais">
              Novo material
            </BotaoLink>
          </>
        )}
      </Cabecalho>

      <form className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icone nome="busca" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            name="busca"
            defaultValue={busca}
            placeholder="Buscar material pelo nome..."
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-3 outline-none focus:border-destaque-500 focus:ring-2 focus:ring-destaque-200"
          />
        </div>
        {admin && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="inativos" value="1" defaultChecked={inativos === "1"} className="accent-marca-600" />
            Mostrar desativados
          </label>
        )}
        <button className={CLASSE_BOTAO}>Buscar</button>
      </form>

      <Cartao className="overflow-x-auto">
        {materiais.length === 0 ? (
          <Vazio>
            {busca
              ? "Nenhum material encontrado com esse nome."
              : admin
                ? "Nenhum material cadastrado ainda. Use “Importar planilha” para trazer a lista de insumos."
                : "Nenhum material cadastrado ainda."}
          </Vazio>
        ) : (
          <table className={CLASSE_TABELA}>
            <thead>
              <tr>
                <th className={CLASSE_TH}>Material</th>
                <th className={CLASSE_TH}>Unidade</th>
                {admin && <th className={CLASSE_TH}>Situação</th>}
              </tr>
            </thead>
            <tbody>
              {materiais.map((m) => (
                <tr key={m.id} className="hover:bg-marca-50/40">
                  <td className={CLASSE_TD}>
                    {admin ? (
                      <Link href={`/materiais/${m.id}`} className="font-medium hover:text-marca-700 hover:underline">
                        {m.nome}
                      </Link>
                    ) : (
                      m.nome
                    )}
                  </td>
                  <td className={`${CLASSE_TD} text-slate-600`}>{m.unidade}</td>
                  {admin && (
                    <td className={CLASSE_TD}>
                      {m.ativo ? <Etiqueta cor="verde">Ativo</Etiqueta> : <Etiqueta cor="cinza">Desativado</Etiqueta>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
      {total > materiais.length && (
        <p className="mt-3 text-sm text-slate-500">
          Mostrando {materiais.length} de {total.toLocaleString("pt-BR")}. Digite parte do nome para achar mais rápido.
        </p>
      )}
    </>
  );
}
