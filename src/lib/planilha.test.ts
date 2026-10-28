import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lerCsv, lerPlanilha } from "./planilha";

// Planilha de exemplo com dados inventados (a planilha real da empresa nunca entra no GitHub).
const EXEMPLO = path.join(__dirname, "exemplos", "insumos-exemplo.xlsx");

describe("lerPlanilha", () => {
  it("lê o .xlsx, acha o cabeçalho abaixo do título e pula a aba sem colunas", () => {
    const r = lerPlanilha("insumos.xlsx", readFileSync(EXEMPLO));
    if (!r.ok) throw new Error(r.erro);
    expect(r.linhas[0]).toEqual({ linha: 4, nome: "Cimento CP II 50kg", unidade: "saco" });
    expect(r.linhas.map((l) => l.nome)).toContain("Tijolo & bloco cerâmico");
    expect(r.linhas.find((l) => l.nome === "Prego 17x27")?.unidade).toBe("");
    expect(r.linhas).toHaveLength(7);
  });

  it("lê CSV com ponto e vírgula e acentos do Excel no Windows", () => {
    const texto = "Nome;Unidade\r\nAreia média;m³\r\n\"Tubo PVC 100mm; esgoto\";barra\r\n";
    const r = lerPlanilha("insumos.csv", Buffer.from(texto, "latin1"));
    if (!r.ok) throw new Error(r.erro);
    expect(r.linhas).toEqual([
      { linha: 2, nome: "Areia média", unidade: "m³" },
      { linha: 3, nome: "Tubo PVC 100mm; esgoto", unidade: "barra" },
    ]);
  });

  it("explica quando o formato não serve", () => {
    const xls = lerPlanilha("antiga.xls", Buffer.from("x"));
    expect(!xls.ok && xls.erro).toMatch(/Salvar como/);
    const semColunas = lerPlanilha("x.csv", Buffer.from("Código;Preço\n1;2\n"));
    expect(!semColunas.ok && semColunas.erro).toMatch(/Não achei as colunas/);
    const quebrado = lerPlanilha("x.xlsx", Buffer.from("não é zip"));
    expect(!quebrado.ok && quebrado.erro).toMatch(/Não foi possível ler/);
  });
});

describe("lerCsv", () => {
  it("separa por vírgula e respeita aspas", () => {
    expect(lerCsv('a,b\n"x, y","com ""aspas"""')).toEqual([
      ["a", "b"],
      ["x, y", 'com "aspas"'],
    ]);
  });
});
