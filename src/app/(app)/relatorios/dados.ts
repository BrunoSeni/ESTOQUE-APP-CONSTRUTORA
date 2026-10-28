import type { DatabaseSync } from "node:sqlite";
import type { Obra } from "@/lib/cadastros";
import type { Celula } from "@/lib/excel";
import { consumoPorPeriodo, listarSaldos } from "@/lib/movimentos";

// Monta o relatório pedido. A tela e a planilha do Excel usam exatamente as mesmas linhas.

export type FiltroRelatorio = { tipo?: string; obra?: string; de?: string; ate?: string };

export type Relatorio = {
  tipo: "saldo" | "consumo";
  obra: string;
  de: string;
  ate: string;
  titulo: string;
  colunas: string[];
  // Colunas com número (alinhadas à direita na tela).
  numericas: number[];
  larguras: number[];
  linhas: Celula[][];
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
  const hoje = new Date();

  if (tipo === "saldo") {
    return {
      tipo,
      obra: escolhida ? String(escolhida.id) : "todas",
      de: "",
      ate: "",
      titulo: `Saldo por obra · ${nomeObras} · ${hoje.toLocaleDateString("pt-BR")}`,
      colunas: ["Obra", "Material", "Unidade", "Saldo"],
      numericas: [3],
      larguras: [28, 50, 10, 12],
      linhas: listarSaldos(db, obraIds).map((s) => [s.obra, s.material, s.unidade, s.saldo]),
      arquivo: `saldo-${dataLocal(hoje)}.xlsx`,
    };
  }

  // Sem datas escolhidas: do dia 1º do mês até hoje.
  const de = filtro.de && DATA.test(filtro.de) ? filtro.de : dataLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const ate = filtro.ate && DATA.test(filtro.ate) ? filtro.ate : dataLocal(hoje);
  const br = (d: string) => d.split("-").reverse().join("/");
  return {
    tipo,
    obra: escolhida ? String(escolhida.id) : "todas",
    de,
    ate,
    titulo: `Consumo de ${br(de)} a ${br(ate)} · ${nomeObras}`,
    colunas: ["Obra", "Etapa / serviço", "Material", "Unidade", "Quantidade", "Nº de saídas"],
    numericas: [4, 5],
    larguras: [28, 24, 50, 10, 12, 12],
    linhas: consumoPorPeriodo(db, { obraIds, de, ate }).map((c) => [
      c.obra,
      c.etapa,
      c.material,
      c.unidade,
      c.quantidade,
      c.saidas,
    ]),
    arquivo: `consumo-${de}-a-${ate}.xlsx`,
  };
}
