import type { DatabaseSync } from "node:sqlite";
import type { Perfil } from "./auth";
import { limparTexto } from "./cadastros";
import { formatarQuantidade, validarRetirada } from "./estoque";

// Entradas, saídas, saldo e relatórios. Funções puras sobre o banco, para poder testar.

// ---------- Quem pode o quê ----------

// Almoxarife lança na sua obra; o administrador também pode lançar.
export function podeLancar(perfil: Perfil): boolean {
  return perfil === "almoxarife" || perfil === "admin";
}

// Relatórios: escritório/compras e administrador.
export function podeVerRelatorios(perfil: Perfil): boolean {
  return perfil === "escritorio" || perfil === "admin";
}

// ---------- Quantidade ----------

// Aceita "10", "2,5", "1.250" e "1.250,75" (jeito brasileiro) e também "2.5".
export function lerQuantidade(texto: string): number | null {
  let t = texto.trim().replace(/\s/g, "");
  if (!t) return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Math.round(Number(t) * 1000) / 1000;
  return n > 0 ? n : null;
}

// ---------- Lançamentos ----------

type MaterialAtivo = { id: number; nome: string; unidade: string };

function materialAtivo(db: DatabaseSync, id: number): MaterialAtivo | null {
  return (
    (db.prepare("select id, nome, unidade from materiais where id = ? and ativo = 1").get(id) as MaterialAtivo) ?? null
  );
}

function obraEmAndamento(db: DatabaseSync, id: number): boolean {
  return db.prepare("select 1 from obras where id = ? and encerrada_em is null").get(id) !== undefined;
}

export type ResultadoLancamento = { erro: string } | { mensagem: string };

export function registrarEntrada(
  db: DatabaseSync,
  dados: {
    obraId: number;
    materialId: number;
    quantidade: string;
    fornecedor: string;
    notaFiscal: string;
    observacao?: string;
    usuarioId: number;
  },
): ResultadoLancamento {
  if (!obraEmAndamento(db, dados.obraId)) return { erro: "Escolha uma obra em andamento." };
  const material = materialAtivo(db, dados.materialId);
  if (!material) return { erro: "Escolha o material." };
  const quantidade = lerQuantidade(dados.quantidade);
  if (quantidade === null) return { erro: "Informe uma quantidade maior que zero (ex.: 10 ou 2,5)." };
  const fornecedor = limparTexto(dados.fornecedor);
  const notaFiscal = limparTexto(dados.notaFiscal);
  if (!fornecedor) return { erro: "Informe o fornecedor." };
  if (!notaFiscal) return { erro: "Informe o número da nota fiscal." };

  db.prepare(
    `insert into movimentos (obra_id, material_id, tipo, quantidade, fornecedor, nota_fiscal, observacao, registrado_por)
     values (?, ?, 'entrada', ?, ?, ?, ?, ?)`,
  ).run(dados.obraId, material.id, quantidade, fornecedor, notaFiscal, limparTexto(dados.observacao ?? "") || null, dados.usuarioId);
  return { mensagem: `Entrada registrada: ${formatarQuantidade(quantidade)} ${material.unidade} de ${material.nome}.` };
}

export function registrarSaida(
  db: DatabaseSync,
  dados: {
    obraId: number;
    materialId: number;
    quantidade: string;
    retiradoPor: string;
    etapa: string;
    observacao?: string;
    usuarioId: number;
  },
): ResultadoLancamento {
  if (!obraEmAndamento(db, dados.obraId)) return { erro: "Escolha uma obra em andamento." };
  const material = materialAtivo(db, dados.materialId);
  if (!material) return { erro: "Escolha o material." };
  const quantidade = lerQuantidade(dados.quantidade);
  if (quantidade === null) return { erro: "Informe uma quantidade maior que zero (ex.: 10 ou 2,5)." };
  const retiradoPor = limparTexto(dados.retiradoPor);
  const etapa = limparTexto(dados.etapa);
  if (!retiradoPor) return { erro: "Informe quem retirou o material." };
  if (!etapa) return { erro: "Informe a etapa ou o serviço (ex.: alvenaria)." };

  const saldo = saldoDoMaterial(db, dados.obraId, material.id);
  if (validarRetirada(saldo, quantidade)) {
    return { erro: `Só tem ${formatarQuantidade(saldo)} ${material.unidade} de ${material.nome} nesta obra.` };
  }

  db.prepare(
    `insert into movimentos (obra_id, material_id, tipo, quantidade, retirado_por, etapa, observacao, registrado_por)
     values (?, ?, 'saida', ?, ?, ?, ?, ?)`,
  ).run(dados.obraId, material.id, quantidade, retiradoPor, etapa, limparTexto(dados.observacao ?? "") || null, dados.usuarioId);
  return { mensagem: `Saída registrada: ${formatarQuantidade(quantidade)} ${material.unidade} de ${material.nome}.` };
}

// Sugestões para os campos de texto, a partir do que já foi digitado antes.
export const ETAPAS_COMUNS = [
  "Fundação",
  "Estrutura",
  "Alvenaria",
  "Instalações elétricas",
  "Instalações hidráulicas",
  "Reboco",
  "Contrapiso",
  "Revestimento",
  "Pintura",
  "Cobertura",
  "Acabamento",
];

export function sugestoes(db: DatabaseSync, campo: "fornecedor" | "retirado_por" | "etapa"): string[] {
  const usados = (
    db
      .prepare(`select distinct ${campo} as v from movimentos where ${campo} is not null order by registrado_em desc limit 200`)
      .all() as { v: string }[]
  ).map((l) => l.v);
  const todos = campo === "etapa" ? [...usados, ...ETAPAS_COMUNS] : usados;
  const vistos = new Set<string>();
  return todos.filter((v) => {
    const k = v.toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });
}

// ---------- Saldo ----------

export function saldoDoMaterial(db: DatabaseSync, obraId: number, materialId: number): number {
  const linha = db.prepare("select saldo from saldos where obra_id = ? and material_id = ?").get(obraId, materialId) as
    | { saldo: number }
    | undefined;
  return linha?.saldo ?? 0;
}

export type LinhaSaldo = { obra_id: number; obra: string; material_id: number; material: string; unidade: string; saldo: number };

// Saldo de cada material nas obras pedidas. Só mostra o que tem saldo (diferente de zero).
export function listarSaldos(db: DatabaseSync, obraIds: number[]): LinhaSaldo[] {
  if (obraIds.length === 0) return [];
  return db
    .prepare(
      `select s.obra_id, o.nome as obra, s.material_id, m.nome as material, m.unidade, s.saldo
       from saldos s
       join obras o on o.id = s.obra_id
       join materiais m on m.id = s.material_id
       where s.obra_id in (${obraIds.map(() => "?").join(",")}) and abs(s.saldo) > 0.0005
       order by o.nome collate nocase, m.nome collate nocase`,
    )
    .all(...obraIds) as LinhaSaldo[];
}

// ---------- Consumo por período ----------

export type LinhaConsumo = { obra: string; etapa: string; material: string; unidade: string; quantidade: number; saidas: number };

// Data do formulário (AAAA-MM-DD, no horário daqui) mais "dias", no formato guardado no banco (UTC).
export function dataParaBanco(data: string, dias = 0): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const d = new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// Quanto de cada material saiu, por obra e por etapa/serviço, entre duas datas (incluídas).
export function consumoPorPeriodo(
  db: DatabaseSync,
  filtro: { obraIds: number[]; de: string; ate: string },
): LinhaConsumo[] {
  const inicio = dataParaBanco(filtro.de);
  const fim = dataParaBanco(filtro.ate, 1);
  if (!inicio || !fim || filtro.obraIds.length === 0) return [];

  return db
    .prepare(
      `select o.nome as obra, coalesce(mv.etapa, '') as etapa, m.nome as material, m.unidade,
         round(sum(mv.quantidade), 3) as quantidade, count(*) as saidas
       from movimentos mv
       join obras o on o.id = mv.obra_id
       join materiais m on m.id = mv.material_id
       where mv.tipo = 'saida' and mv.registrado_em >= ? and mv.registrado_em < ?
         and mv.obra_id in (${filtro.obraIds.map(() => "?").join(",")})
       group by mv.obra_id, coalesce(mv.etapa, ''), mv.material_id
       order by o.nome collate nocase, etapa collate nocase, m.nome collate nocase`,
    )
    .all(inicio, fim, ...filtro.obraIds) as LinhaConsumo[];
}

// ---------- Últimos lançamentos (para conferir logo depois de lançar) ----------

export type Lancamento = {
  id: number;
  tipo: string;
  material: string;
  unidade: string;
  quantidade: number;
  detalhe: string;
  quem: string;
  registrado_em: string;
};

export function ultimosLancamentos(db: DatabaseSync, obraId: number, tipo: "entrada" | "saida", limite = 5): Lancamento[] {
  return db
    .prepare(
      `select mv.id, mv.tipo, m.nome as material, m.unidade, mv.quantidade,
         case when mv.tipo = 'entrada' then mv.fornecedor || ' · NF ' || mv.nota_fiscal
              else mv.retirado_por || ' · ' || mv.etapa end as detalhe,
         u.nome as quem, mv.registrado_em
       from movimentos mv
       join materiais m on m.id = mv.material_id
       join usuarios u on u.id = mv.registrado_por
       where mv.obra_id = ? and mv.tipo = ?
       order by mv.id desc limit ?`,
    )
    .all(obraId, tipo, limite) as Lancamento[];
}

// Datas do banco estão em UTC; mostra no horário do computador onde o app roda.
export function formatarDataHora(utc: string): string {
  return new Date(`${utc.replace(" ", "T")}Z`).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Materiais para escolher no lançamento, com o saldo atual na obra.
export type MaterialLancamento = { id: number; nome: string; unidade: string; saldo: number };

export function materiaisParaLancamento(db: DatabaseSync, obraId: number, soComSaldo: boolean): MaterialLancamento[] {
  return db
    .prepare(
      `select m.id, m.nome, m.unidade, coalesce(s.saldo, 0) as saldo
       from materiais m
       left join saldos s on s.material_id = m.id and s.obra_id = ?
       where m.ativo = 1 ${soComSaldo ? "and s.saldo > 0.0005" : ""}
       order by m.nome collate nocase`,
    )
    .all(obraId) as MaterialLancamento[];
}
