import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { gerarPdf, textoSeguro } from "./pdf";

describe("relatório em PDF", () => {
  it("troca símbolos que a fonte do PDF não tem, mantendo os acentos", () => {
    expect(textoSeguro("Areia média m³ – R$ 10,00 · ação")).toBe("Areia média m³ – R$ 10,00 · ação");
    expect(textoSeguro("Tubo ✓ 20mm\tok")).toBe("Tubo ? 20mm ok");
  });

  it("gera um PDF com uma página a mais quando as linhas não cabem", async () => {
    const base = {
      titulo: "Saldo por obra",
      subtitulo: "Todas as obras",
      resumo: [{ rotulo: "Valor total em estoque", valor: "R$ 1.000,00" }],
      colunas: [
        { titulo: "Material", largura: 40 },
        { titulo: "Saldo", largura: 10, direita: true },
      ],
      vazio: "Nada aqui.",
      rodape: "Gerado por teste",
    };
    const curto = await PDFDocument.load(await gerarPdf({ ...base, linhas: [["Cimento ✓", "10"]] }));
    expect(curto.getPageCount()).toBe(1);
    const linhas = Array.from({ length: 60 }, (_, i) => [`Material ${i} com um nome bem comprido `.repeat(5), String(i)]);
    const longo = await PDFDocument.load(await gerarPdf({ ...base, linhas }));
    expect(longo.getPageCount()).toBe(3);
    const vazio = await PDFDocument.load(await gerarPdf({ ...base, linhas: [] }));
    expect(vazio.getPageCount()).toBe(1);
  });
});
