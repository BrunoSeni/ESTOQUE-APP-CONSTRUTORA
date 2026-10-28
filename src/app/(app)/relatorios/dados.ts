import type { DatabaseSync } from "node:sqlite";
import type { Obra } from "@/lib/cadastros";
import type { Celula } from "@/lib/excel";
import { formatarQuantidade } from "@/lib/estoque";
import { formatarMoeda } from "@/lib/moeda";
import { consumoPorPeriodo, listarSaldos, somarValor } from "@/lib/movimentos";

// Monta o relatório pedido. O PDF e a planilha do Excel usam exatamente as mesmas linhas.

export type FiltroRelatorio = { tipo?: string; obra?: string; de?: string; ate?: string };

export type Coluna = {
  titulo: string;
  tipo: "texto" | "quantidade" | "moeda";
  // Largura no Excel (em letras) e no PDF (proporção da largura da página).
  largura: number;
};

export type Relatorio = {
  tipo: "saldo" | "consumo";
  obra: string;
  de: string;
  ate: string;
  titulo: string;
  subtitulo: string;
  colunas: Coluna[];
  linhas: Celula[][];
  // Números em destaque no topo do PDF, como o valor total em estoque.
  resumo: { rotulo: string; valor: string }[];
  arquivo: string;
};

function dataLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function montarRelatorio(db: DatabaseSync, obras: Obra[], filtro: FiltroRelatorio): Relatorio {
  const tipo = filtro.tipo === "consumo" ? "consumo" : "saldo";
  const escolhida = obras.find((o) => String(o.id) === filtro.obra);
  const obraIds = escolhida ? [escolhida.id] : obras.map((o) => o.id);
  const nomeObras = escolhida ? escolhida.nome : "Todas as obras";
  const obra = escolhida ? String(escolhida.id) : "todas";
  const hoje = new Date();

  if (tipo === "saldo") {
    const saldos = listarSaldos(db, obraIds);
    return {
      tipo,
      obra,
      de: "",
      ate: "",
      titulo: "Saldo por obra",
      subtitulo: `${nomeObras} · posição em ${hoje.toLocaleDateString("pt-BR")}`,
      colunas: [
        { titulo: "Obra", tipo: "texto", largura: 26 },
        { titulo: "Material", tipo: "texto", largura: 46 },
        { titulo: "Unidade", tipo: "texto", largura: 9 },
        { titulo: "Saldo", tipo: "quantidade", largura: 12 },
        { titulo: "Custo médio", tipo: "moeda", largura: 14 },
        { titulo: "Valor em estoque", tipo: "moeda", largura: 16 },
      ],
      linhas: saldos.map((s) => [s.obra, s.material, s.unidade, s.saldo, s.custo_medio, s.valor]),
      resumo: [
        { rotulo: "Valor total em estoque", valor: formatarMoeda(somarValor(saldos)) },
        { rotulo: "Materiais com saldo", valor: saldos.length.toLocaleString("pt-BR") },
        { rotulo: "Obras", valor: new Set(saldos.map((s) => s.obra_id)).size.toLocaleString("pt-BR") },
      ],
      arquivo: `saldo-${dataLocal(hoje)}`,
    };
  }

  // Sem datas escolhidas: do dia 1º do mês até hoje.
  const de = filtro.de && DATA.test(filtro.de) ? filtro.de : dataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const ate = filtro.ate && DATA.test(filtro.ate) ? filtro.ate : dataLocal(hoje);
  const br = (d: string) => d.split("-").reverse().join("/");
  const consumo = consumoPorPeriodo(db, { obraIds, de, ate });
  return {
    tipo,
    obra,
    de,
    ate,
    titulo: "Consumo por período",
    subtitulo: `${nomeObras} · de ${br(de)} a ${br(ate)}`,
    colunas: [
      { titulo: "Obra", tipo: "texto", largura: 24 },
      { titulo: "Etapa / serviço", tipo: "texto", largura: 22 },
      { titulo: "Material", tipo: "texto", largura: 42 },
      { titulo: "Unidade", tipo: "texto", largura: 9 },
      { titulo: "Quantidade", tipo: "quantidade", largura: 12 },
      { titulo: "Saídas", tipo: "quantidade", largura: 9 },
      { titulo: "Valor", tipo: "moeda", largura: 15 },
    ],
    linhas: consumo.map((c) => [c.obra, c.etapa, c.material, c.unidade, c.quantidade, c.saidas, c.valor]),
    resumo: [
      { rotulo: "Valor consumido", valor: formatarMoeda(somarValor(consumo)) },
      { rotulo: "Saídas registradas", valor: consumo.reduce((t, c) => t + c.saidas, 0).toLocaleString("pt-BR") },
      { rotulo: "Materiais diferentes", valor: new Set(consumo.map((c) => c.material)).size.toLocaleString("pt-BR") },
    ],
    arquivo: `consumo-${de}-a-${ate}`,
  };
}

// Texto de uma célula como aparece no PDF.
export function textoCelula(valor: Celula, coluna: Coluna): string {
  if (valor === null || valor === "") return "—";
  if (typeof valor === "number") return coluna.tipo === "moeda" ? formatarMoeda(valor) : formatarQuantidade(valor);
  return valor;
}
