import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { criarUsuario } from "./auth";
import { encerrarObra, salvarMaterial, salvarObra } from "./cadastros";
import { abrirBanco } from "./db";
import {
  consumoPorPeriodo,
  lerQuantidade,
  listarSaldos,
  materiaisParaLancamento,
  podeLancar,
  podeVerRelatorios,
  registrarEntrada,
  registrarSaida,
  saldoDoMaterial,
  sugestoes,
  ultimosLancamentos,
} from "./movimentos";

let db: DatabaseSync;
let usuarioId: number;
let obraA: number;
let obraB: number;
let cimento: number;
let areia: number;

function id(r: { erro: string } | { id: number }): number {
  if ("erro" in r) throw new Error(r.erro);
  return r.id;
}

function hoje(dias = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const entrada = (obraId: number, materialId: number, quantidade: string) =>
  registrarEntrada(db, { obraId, materialId, quantidade, fornecedor: "Depósito Exemplo", notaFiscal: "123", usuarioId });
const saida = (obraId: number, materialId: number, quantidade: string, etapa = "Alvenaria") =>
  registrarSaida(db, { obraId, materialId, quantidade, retiradoPor: "João", etapa, usuarioId });

beforeEach(() => {
  db = abrirBanco(":memory:");
  usuarioId = criarUsuario(db, { nome: "Almox", email: "almox@exemplo.com", senha: "senha-forte", perfil: "almoxarife" });
  obraA = id(salvarObra(db, null, { nome: "Obra A", endereco: "" }));
  obraB = id(salvarObra(db, null, { nome: "Obra B", endereco: "" }));
  cimento = id(salvarMaterial(db, null, { nome: "Cimento CP II", unidade: "saco" }));
  areia = id(salvarMaterial(db, null, { nome: "Areia média", unidade: "m³" }));
});

describe("quantidade digitada", () => {
  it("entende o jeito brasileiro de escrever números", () => {
    expect(lerQuantidade("10")).toBe(10);
    expect(lerQuantidade("2,5")).toBe(2.5);
    expect(lerQuantidade("1.250")).toBe(1250);
    expect(lerQuantidade("1.250,75")).toBe(1250.75);
    expect(lerQuantidade("0.5")).toBe(0.5);
    expect(lerQuantidade("0")).toBeNull();
    expect(lerQuantidade("-3")).toBeNull();
    expect(lerQuantidade("abc")).toBeNull();
    expect(lerQuantidade("")).toBeNull();
  });
});

describe("perfis", () => {
  it("só almoxarife e administrador lançam; só escritório e administrador veem relatórios", () => {
    expect(["almoxarife", "engenheiro", "escritorio", "admin"].filter((p) => podeLancar(p as never))).toEqual([
      "almoxarife",
      "admin",
    ]);
    expect(["almoxarife", "engenheiro", "escritorio", "admin"].filter((p) => podeVerRelatorios(p as never))).toEqual([
      "escritorio",
      "admin",
    ]);
  });
});

describe("entrada e saída", () => {
  it("entrada soma no saldo e pede fornecedor e nota fiscal", () => {
    expect(entrada(obraA, cimento, "50")).toEqual({ mensagem: "Entrada registrada: 50 saco de Cimento CP II." });
    expect(saldoDoMaterial(db, obraA, cimento)).toBe(50);
    expect(saldoDoMaterial(db, obraB, cimento)).toBe(0);

    expect(registrarEntrada(db, { obraId: obraA, materialId: cimento, quantidade: "1", fornecedor: " ", notaFiscal: "1", usuarioId })).toEqual({
      erro: "Informe o fornecedor.",
    });
    expect(registrarEntrada(db, { obraId: obraA, materialId: cimento, quantidade: "1", fornecedor: "X", notaFiscal: "", usuarioId })).toEqual({
      erro: "Informe o número da nota fiscal.",
    });
    expect(entrada(obraA, cimento, "0")).toHaveProperty("erro");
    expect(entrada(obraA, 999, "1")).toEqual({ erro: "Escolha o material." });
  });

  it("saída tira do saldo e não deixa sair mais do que tem", () => {
    entrada(obraA, areia, "3,5");
    expect(saida(obraA, areia, "1,25")).toEqual({ mensagem: "Saída registrada: 1,25 m³ de Areia média." });
    expect(saldoDoMaterial(db, obraA, areia)).toBe(2.25);
    expect(saida(obraA, areia, "3")).toEqual({ erro: "Só tem 2,25 m³ de Areia média nesta obra." });
    expect(saida(obraB, areia, "1")).toEqual({ erro: "Só tem 0 m³ de Areia média nesta obra." });
    expect(saida(obraA, areia, "2,25")).toHaveProperty("mensagem");
    expect(saldoDoMaterial(db, obraA, areia)).toBe(0);

    expect(registrarSaida(db, { obraId: obraA, materialId: areia, quantidade: "1", retiradoPor: "", etapa: "X", usuarioId })).toEqual({
      erro: "Informe quem retirou o material.",
    });
  });

  it("não lança em obra encerrada nem em material desativado", () => {
    encerrarObra(db, obraB, true);
    expect(entrada(obraB, cimento, "1")).toEqual({ erro: "Escolha uma obra em andamento." });
    db.prepare("update materiais set ativo = 0 where id = ?").run(areia);
    expect(entrada(obraA, areia, "1")).toEqual({ erro: "Escolha o material." });
  });

  it("guarda sugestões e mostra os últimos lançamentos", () => {
    entrada(obraA, cimento, "10");
    saida(obraA, cimento, "2", "Reboco");
    expect(sugestoes(db, "fornecedor")).toEqual(["Depósito Exemplo"]);
    expect(sugestoes(db, "etapa")[0]).toBe("Reboco");
    expect(sugestoes(db, "etapa").filter((e) => e === "Reboco")).toHaveLength(1);
    const ultimas = ultimosLancamentos(db, obraA, "saida");
    expect(ultimas).toHaveLength(1);
    expect(ultimas[0]).toMatchObject({ material: "Cimento CP II", quantidade: 2, detalhe: "João · Reboco", quem: "Almox" });
  });
});

describe("saldo e relatórios", () => {
  it("lista o saldo por obra, sem materiais zerados", () => {
    entrada(obraA, cimento, "10");
    entrada(obraA, areia, "2");
    saida(obraA, areia, "2");
    entrada(obraB, cimento, "4");
    expect(listarSaldos(db, [obraA]).map((l) => [l.obra, l.material, l.saldo])).toEqual([["Obra A", "Cimento CP II", 10]]);
    expect(listarSaldos(db, [obraA, obraB]).map((l) => [l.obra, l.saldo])).toEqual([
      ["Obra A", 10],
      ["Obra B", 4],
    ]);
    expect(listarSaldos(db, [])).toEqual([]);
  });

  it("soma o consumo do período por obra, etapa e material", () => {
    entrada(obraA, cimento, "20");
    entrada(obraB, cimento, "20");
    saida(obraA, cimento, "3", "Alvenaria");
    saida(obraA, cimento, "2", "Alvenaria");
    saida(obraA, cimento, "1", "Reboco");
    saida(obraB, cimento, "4", "Alvenaria");

    const consumo = consumoPorPeriodo(db, { obraIds: [obraA], de: hoje(), ate: hoje() });
    expect(consumo.map((l) => [l.obra, l.etapa, l.material, l.quantidade, l.saidas])).toEqual([
      ["Obra A", "Alvenaria", "Cimento CP II", 5, 2],
      ["Obra A", "Reboco", "Cimento CP II", 1, 1],
    ]);
    expect(consumoPorPeriodo(db, { obraIds: [obraA, obraB], de: hoje(-30), ate: hoje() })).toHaveLength(3);
    expect(consumoPorPeriodo(db, { obraIds: [obraA], de: hoje(1), ate: hoje(5) })).toEqual([]);
    expect(consumoPorPeriodo(db, { obraIds: [obraA], de: "", ate: hoje() })).toEqual([]);
  });
});

describe("materiais para lançar", () => {
  it("na saída só aparecem materiais com saldo na obra", () => {
    entrada(obraA, areia, "2");
    expect(materiaisParaLancamento(db, obraA, false).map((m) => [m.nome, m.saldo])).toEqual([
      ["Areia média", 2],
      ["Cimento CP II", 0],
    ]);
    expect(materiaisParaLancamento(db, obraA, true).map((m) => m.nome)).toEqual(["Areia média"]);
    expect(materiaisParaLancamento(db, obraB, true)).toEqual([]);
  });
});
