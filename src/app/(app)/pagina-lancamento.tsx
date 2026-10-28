import { redirect } from "next/navigation";
import { banco } from "@/lib/db";
import { formatarQuantidade } from "@/lib/estoque";
import { formatarMoeda } from "@/lib/moeda";
import { formatarDataHora, materiaisParaLancamento, podeLancar, sugestoes, ultimosLancamentos } from "@/lib/movimentos";
import { exigirUsuario, obraAtual } from "@/lib/sessao";
import { lancarAcao } from "./acoes";
import { FormularioLancamento } from "./formulario-lancamento";
import { BotaoLink, Cabecalho, Cartao, CLASSE_TABELA, CLASSE_TD, CLASSE_TH, Vazio } from "./ui";

// Tela de entrada ou de saída de material da obra atual (as duas são bem parecidas).
export async function PaginaLancamento({ tipo }: { tipo: "entrada" | "saida" }) {
  const usuario = await exigirUsuario();
  if (!podeLancar(usuario.perfil)) redirect("/saldo");
  const { atual } = await obraAtual(usuario);
  const db = banco();
  const entrada = tipo === "entrada";
  const titulo = entrada ? "Entrada de material" : "Saída de material";

  if (!atual) {
    return (
      <div className="max-w-2xl">
        <Cabecalho titulo={titulo} />
        <Cartao>
          <Vazio>Nenhuma obra liberada para você. Peça ao administrador para incluir você em uma obra.</Vazio>
        </Cartao>
      </div>
    );
  }

  // As linhas do banco viram objetos simples para poderem ir para a tela do navegador.
  const materiais = materiaisParaLancamento(db, atual.id, !entrada).map((m) => ({ ...m }));
  const ultimos = ultimosLancamentos(db, atual.id, tipo);

  return (
    <div className="max-w-2xl">
      <Cabecalho
        titulo={titulo}
        subtitulo={entrada ? `Material que chegou na obra ${atual.nome}.` : `Material usado na obra ${atual.nome}.`}
      />

      {materiais.length === 0 ? (
        <Cartao className="p-6 text-center">
          <p className="text-slate-600">
            {entrada
              ? "Nenhum material cadastrado ainda. O administrador precisa importar a planilha de materiais."
              : "Esta obra ainda não tem material no estoque. Registre uma entrada primeiro."}
          </p>
          {!entrada && (
            <div className="mt-4">
              <BotaoLink href="/entrada" icone="entrada">
                Registrar entrada
              </BotaoLink>
            </div>
          )}
        </Cartao>
      ) : (
        <FormularioLancamento
          acao={lancarAcao.bind(null, tipo)}
          obraId={atual.id}
          materiais={materiais}
          mostrarSaldo={!entrada}
          botao={entrada ? "Registrar entrada" : "Registrar saída"}
          campos={
            entrada
              ? [
                  { nome: "fornecedor", rotulo: "Fornecedor", obrigatorio: true, sugestoes: sugestoes(db, "fornecedor") },
                  { nome: "nota_fiscal", rotulo: "Número da nota fiscal", obrigatorio: true },
                  {
                    nome: "valor_unitario",
                    rotulo: "Valor unitário (R$)",
                    obrigatorio: true,
                    tipo: "valor",
                    ajuda: "Valor de 1 unidade, como está na nota fiscal.",
                  },
                  { nome: "observacao", rotulo: "Observação" },
                ]
              : [
                  { nome: "retirado_por", rotulo: "Quem retirou", obrigatorio: true, sugestoes: sugestoes(db, "retirado_por") },
                  {
                    nome: "etapa",
                    rotulo: "Etapa ou serviço",
                    obrigatorio: true,
                    sugestoes: sugestoes(db, "etapa"),
                    ajuda: "Ex.: fundação, alvenaria, reboco.",
                  },
                  { nome: "observacao", rotulo: "Observação" },
                ]
          }
        />
      )}

      {ultimos.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {entrada ? "Últimas entradas" : "Últimas saídas"} desta obra
          </h2>
          <Cartao className="overflow-x-auto">
            <table className={CLASSE_TABELA}>
              <thead>
                <tr>
                  <th className={CLASSE_TH}>Material</th>
                  <th className={`${CLASSE_TH} text-right`}>Qtd.</th>
                  <th className={CLASSE_TH}>{entrada ? "Fornecedor · NF" : "Quem retirou · Etapa"}</th>
                  <th className={`${CLASSE_TH} hidden sm:table-cell`}>Quando</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map((l) => (
                  <tr key={l.id}>
                    <td className={`${CLASSE_TD} font-medium`}>{l.material}</td>
                    <td className={`${CLASSE_TD} whitespace-nowrap text-right`}>
                      {formatarQuantidade(l.quantidade)} {l.unidade}
                      {l.valor_unitario !== null && (
                        <span className="block text-xs text-slate-500">{formatarMoeda(l.quantidade * l.valor_unitario)}</span>
                      )}
                    </td>
                    <td className={`${CLASSE_TD} text-slate-600`}>
                      {l.detalhe}
                      {/* No celular a data vai embaixo, para a tabela caber na tela. */}
                      <span className="block text-xs text-slate-400 sm:hidden">
                        {formatarDataHora(l.registrado_em)} · {l.quem}
                      </span>
                    </td>
                    <td className={`${CLASSE_TD} hidden whitespace-nowrap text-slate-600 sm:table-cell`}>
                      {formatarDataHora(l.registrado_em)}
                      <span className="block text-xs text-slate-400">{l.quem}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Cartao>
        </>
      )}
    </div>
  );
}
