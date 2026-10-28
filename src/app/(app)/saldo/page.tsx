import { limparTexto, semAcento } from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { formatarQuantidade } from "@/lib/estoque";
import { formatarMoeda } from "@/lib/moeda";
import { listarSaldos, podeLancar, somarValor } from "@/lib/movimentos";
import { exigirUsuario, obraAtual } from "@/lib/sessao";
import { Icone } from "../icones";
import { BotaoLink, Cabecalho, Cartao, CartaoNumero, CLASSE_BOTAO, CLASSE_TABELA, CLASSE_TD, CLASSE_TH, Vazio } from "../ui";

// Quanto tem de cada material na obra atual. Todos os perfis podem consultar.
export default async function Saldo({ searchParams }: { searchParams: Promise<{ busca?: string }> }) {
  const usuario = await exigirUsuario();
  const { atual } = await obraAtual(usuario);
  const { busca = "" } = await searchParams;
  const lanca = podeLancar(usuario.perfil);

  if (!atual) {
    return (
      <>
        <Cabecalho titulo="Saldo" />
        <Cartao>
          <Vazio>Nenhuma obra liberada para você. Peça ao administrador para incluir você em uma obra.</Vazio>
        </Cartao>
      </>
    );
  }

  const todos = listarSaldos(banco(), [atual.id]);
  const palavras = semAcento(limparTexto(busca)).split(" ").filter(Boolean);
  const saldos = palavras.length ? todos.filter((s) => palavras.every((p) => semAcento(s.material).includes(p))) : todos;

  return (
    <>
      <Cabecalho titulo="Saldo" subtitulo={`Quanto tem de cada material na obra ${atual.nome}.`}>
        {lanca && (
          <>
            <BotaoLink href="/saida" icone="saida" claro>
              Saída
            </BotaoLink>
            <BotaoLink href="/entrada" icone="entrada">
              Entrada
            </BotaoLink>
          </>
        )}
      </Cabecalho>

      {todos.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <CartaoNumero
            icone="estoque"
            rotulo="Valor em estoque"
            valor={formatarMoeda(somarValor(todos))}
            texto="pelo custo médio das entradas"
          />
          <CartaoNumero
            icone="material"
            rotulo="Materiais com saldo"
            valor={todos.length.toLocaleString("pt-BR")}
            texto="nesta obra"
          />
        </div>
      )}

      {todos.length > 0 && (
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
          <button className={CLASSE_BOTAO}>Buscar</button>
        </form>
      )}

      <Cartao className="overflow-x-auto">
        {saldos.length === 0 ? (
          <Vazio>
            {busca
              ? "Nenhum material com saldo encontrado com esse nome."
              : "Esta obra ainda não tem material no estoque. O saldo aparece depois da primeira entrada."}
          </Vazio>
        ) : (
          <table className={CLASSE_TABELA}>
            <thead>
              <tr>
                <th className={CLASSE_TH}>Material</th>
                <th className={`${CLASSE_TH} text-right`}>Saldo</th>
                <th className={CLASSE_TH}>Unidade</th>
                <th className={`${CLASSE_TH} text-right`}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {saldos.map((s) => (
                <tr key={s.material_id} className="hover:bg-marca-50/40">
                  <td className={`${CLASSE_TD} font-medium`}>{s.material}</td>
                  <td className={`${CLASSE_TD} text-right text-base font-semibold tabular-nums`}>{formatarQuantidade(s.saldo)}</td>
                  <td className={`${CLASSE_TD} text-slate-600`}>{s.unidade}</td>
                  <td className={`${CLASSE_TD} whitespace-nowrap text-right tabular-nums`}>
                    {s.valor === null ? (
                      <span className="text-slate-400">sem valor</span>
                    ) : (
                      <>
                        {formatarMoeda(s.valor)}
                        <span className="block text-xs text-slate-500">
                          {formatarMoeda(s.custo_medio ?? 0)} / {s.unidade}
                        </span>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Cartao>
      {todos.some((s) => s.valor === null) && (
        <p className="mt-3 text-sm text-slate-500">
          “Sem valor”: material que entrou antes do campo de valor existir. Ele passa a ter valor na próxima entrada.
        </p>
      )}
    </>
  );
}
