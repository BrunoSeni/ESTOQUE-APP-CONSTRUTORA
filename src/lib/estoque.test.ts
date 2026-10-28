import { describe, expect, it } from "vitest";
import { calcularSaldos, validarRetirada, type Movimento } from "./estoque";

describe("calcularSaldos", () => {
  it("soma entradas e desconta saídas e transferências", () => {
    const movimentos: Movimento[] = [
      { materialId: "cimento", tipo: "entrada", quantidade: 100 },
      { materialId: "cimento", tipo: "saida", quantidade: 30 },
      { materialId: "cimento", tipo: "transferencia_saida", quantidade: 20 },
      { materialId: "areia", tipo: "entrada", quantidade: 5 },
      { materialId: "areia", tipo: "transferencia_entrada", quantidade: 2.5 },
    ];
    const saldos = calcularSaldos(movimentos);
    expect(saldos.get("cimento")).toBe(50);
    expect(saldos.get("areia")).toBe(7.5);
  });

  it("aplica correções positivas e negativas", () => {
    const saldos = calcularSaldos([
      { materialId: "brita", tipo: "entrada", quantidade: 10 },
      { materialId: "brita", tipo: "correcao", quantidade: -1.5 },
      { materialId: "brita", tipo: "correcao", quantidade: 0.5 },
    ]);
    expect(saldos.get("brita")).toBe(9);
  });

  it("não acumula erro de arredondamento", () => {
    const saldos = calcularSaldos([
      { materialId: "areia", tipo: "entrada", quantidade: 0.1 },
      { materialId: "areia", tipo: "entrada", quantidade: 0.2 },
    ]);
    expect(saldos.get("areia")).toBe(0.3);
  });
});

describe("validarRetirada", () => {
  it("aceita retirada dentro do saldo", () => {
    expect(validarRetirada(10, 10)).toBeNull();
  });

  it("não deixa sair mais do que tem", () => {
    expect(validarRetirada(10, 11)).toMatch(/maior que o saldo/);
  });

  it("recusa quantidade zero ou negativa", () => {
    expect(validarRetirada(10, 0)).toMatch(/maior que zero/);
    expect(validarRetirada(10, -1)).toMatch(/maior que zero/);
  });
});
