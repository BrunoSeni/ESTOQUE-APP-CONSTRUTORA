import { describe, expect, it } from "vitest";
import { gerarXlsx } from "./excel";
import { lerPlanilha } from "./planilha";

describe("planilha do Excel dos relatórios", () => {
  it("gera um .xlsx que dá para ler de volta, com acentos e símbolos", () => {
    const arquivo = gerarXlsx([
      {
        nome: "Saldo: obra/teste",
        colunas: ["Obra", "Material", "Unidade", "Saldo"],
        linhas: [
          ["Residencial A", "Cimento CP II <50kg> & cia", "saco", 12.5],
          ["Residencial A", "Areia média", "m³", 3],
        ],
      },
    ]);
    expect(arquivo.subarray(0, 2).toString()).toBe("PK");
    const leitura = lerPlanilha("saldo.xlsx", arquivo);
    expect(leitura).toEqual({
      ok: true,
      linhas: [
        { linha: 2, nome: "Cimento CP II <50kg> & cia", unidade: "saco" },
        { linha: 3, nome: "Areia média", unidade: "m³" },
      ],
    });
  });
});
