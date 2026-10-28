import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

// Relatório em PDF com a cara da CR Incorp: logo no topo, cinza-azulado da marca e o amarelo de destaque.

export type ColunaPdf = { titulo: string; largura: number; direita?: boolean };

export type DadosPdf = {
  titulo: string;
  subtitulo: string;
  resumo: { rotulo: string; valor: string }[];
  colunas: ColunaPdf[];
  linhas: string[][];
  vazio: string;
  rodape: string;
  logo?: Uint8Array;
};

// As mesmas cores do app (globals.css).
const COR = {
  marca50: rgb(0xf3 / 255, 0xf5 / 255, 0xf7 / 255),
  marca100: rgb(0xe4 / 255, 0xe8 / 255, 0xec / 255),
  marca700: rgb(0x3f / 255, 0x4b / 255, 0x55 / 255),
  marca800: rgb(0x33 / 255, 0x3d / 255, 0x45 / 255),
  destaque: rgb(0xfa / 255, 0xb5 / 255, 0x1f / 255),
  texto: rgb(0x1e / 255, 0x29 / 255, 0x3b / 255),
  cinza: rgb(0x64 / 255, 0x74 / 255, 0x8b / 255),
  branco: rgb(1, 1, 1),
};

// A4 deitado, para caber todas as colunas.
const LARGURA = 841.89;
const ALTURA = 595.28;
const MARGEM = 36;
const ALTURA_LINHA = 18;
const TAMANHO = 8.5;

// As fontes padrão do PDF só têm as letras do português "ocidental" (Windows-1252).
// Qualquer outro símbolo vira "?" para o PDF não quebrar.
const EXTRAS_1252 = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function textoSeguro(texto: string): string {
  return [...texto.normalize("NFC")]
    .map((c) => {
      const n = c.codePointAt(0)!;
      if ((n >= 0x20 && n <= 0x7e) || (n >= 0xa0 && n <= 0xff) || EXTRAS_1252.includes(c)) return c;
      return n < 0x20 ? " " : "?";
    })
    .join("");
}

// Corta o texto com "…" quando não cabe na largura.
function caber(texto: string, fonte: PDFFont, tamanho: number, largura: number): string {
  if (fonte.widthOfTextAtSize(texto, tamanho) <= largura) return texto;
  let t = texto;
  while (t.length > 1 && fonte.widthOfTextAtSize(`${t}…`, tamanho) > largura) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

export async function gerarPdf(dados: DadosPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(textoSeguro(`${dados.titulo} - ${dados.subtitulo}`));
  pdf.setAuthor("CR Incorp - Estoque da Obra");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = dados.logo ? await pdf.embedPng(dados.logo) : null;

  const escrever = (pagina: PDFPage, texto: string, x: number, y: number, tamanho: number, fonte = normal, cor = COR.texto) =>
    pagina.drawText(textoSeguro(texto), { x, y, size: tamanho, font: fonte, color: cor });

  const larguraUtil = LARGURA - 2 * MARGEM;
  const somaLarguras = dados.colunas.reduce((t, c) => t + c.largura, 0);
  const larguras = dados.colunas.map((c) => (c.largura / somaLarguras) * larguraUtil);

  // Topo de cada página: logo à esquerda, título à direita e a faixa amarela embaixo.
  function topo(pagina: PDFPage, primeira: boolean): number {
    const alturaLogo = primeira ? 46 : 30;
    if (logo) {
      const escala = alturaLogo / logo.height;
      pagina.drawImage(logo, {
        x: MARGEM,
        y: ALTURA - MARGEM - alturaLogo,
        width: logo.width * escala,
        height: alturaLogo,
      });
    }
    const tamTitulo = primeira ? 18 : 13;
    const titulo = textoSeguro(dados.titulo);
    const subtitulo = textoSeguro(dados.subtitulo);
    escrever(pagina, titulo, LARGURA - MARGEM - negrito.widthOfTextAtSize(titulo, tamTitulo), ALTURA - MARGEM - tamTitulo, tamTitulo, negrito, COR.marca800);
    escrever(pagina, subtitulo, LARGURA - MARGEM - normal.widthOfTextAtSize(subtitulo, 10), ALTURA - MARGEM - tamTitulo - 16, 10, normal, COR.cinza);
    const yFaixa = ALTURA - MARGEM - alturaLogo - 10;
    pagina.drawRectangle({ x: MARGEM, y: yFaixa, width: larguraUtil, height: 3, color: COR.destaque });
    return yFaixa - 14;
  }

  // Números em destaque (só na primeira página).
  function resumo(pagina: PDFPage, y: number): number {
    if (dados.resumo.length === 0) return y;
    const espaco = 10;
    const largura = (larguraUtil - espaco * (dados.resumo.length - 1)) / dados.resumo.length;
    const altura = 46;
    dados.resumo.forEach((r, i) => {
      const x = MARGEM + i * (largura + espaco);
      pagina.drawRectangle({ x, y: y - altura, width: largura, height: altura, color: COR.marca50 });
      pagina.drawRectangle({ x, y: y - altura, width: 3, height: altura, color: i === 0 ? COR.destaque : COR.marca700 });
      escrever(pagina, r.rotulo.toUpperCase(), x + 12, y - 16, 7.5, negrito, COR.cinza);
      escrever(pagina, caber(textoSeguro(r.valor), negrito, 15, largura - 20), x + 12, y - 36, 15, negrito, COR.marca800);
    });
    return y - altura - 16;
  }

  function cabecalhoTabela(pagina: PDFPage, y: number): number {
    pagina.drawRectangle({ x: MARGEM, y: y - ALTURA_LINHA - 2, width: larguraUtil, height: ALTURA_LINHA + 2, color: COR.marca700 });
    let x = MARGEM;
    dados.colunas.forEach((c, i) => {
      const t = caber(textoSeguro(c.titulo.toUpperCase()), negrito, 7.5, larguras[i] - 12);
      const tx = c.direita ? x + larguras[i] - 6 - negrito.widthOfTextAtSize(t, 7.5) : x + 6;
      escrever(pagina, t, tx, y - 13, 7.5, negrito, COR.branco);
      x += larguras[i];
    });
    return y - ALTURA_LINHA - 2;
  }

  let pagina = pdf.addPage([LARGURA, ALTURA]);
  let y = resumo(pagina, topo(pagina, true));

  if (dados.linhas.length === 0) {
    pagina.drawRectangle({ x: MARGEM, y: y - 60, width: larguraUtil, height: 60, borderColor: COR.marca100, borderWidth: 1 });
    escrever(pagina, dados.vazio, MARGEM + 16, y - 34, 11, normal, COR.cinza);
  } else {
    y = cabecalhoTabela(pagina, y);
    const limite = MARGEM + 24; // espaço do rodapé
    dados.linhas.forEach((linha, n) => {
      if (y - ALTURA_LINHA < limite) {
        pagina = pdf.addPage([LARGURA, ALTURA]);
        y = cabecalhoTabela(pagina, topo(pagina, false));
      }
      if (n % 2 === 1) pagina.drawRectangle({ x: MARGEM, y: y - ALTURA_LINHA, width: larguraUtil, height: ALTURA_LINHA, color: COR.marca50 });
      let x = MARGEM;
      linha.forEach((valor, i) => {
        const c = dados.colunas[i];
        const fonte = c.direita ? negrito : normal;
        const t = caber(textoSeguro(valor), fonte, TAMANHO, larguras[i] - 12);
        const tx = c.direita ? x + larguras[i] - 6 - fonte.widthOfTextAtSize(t, TAMANHO) : x + 6;
        escrever(pagina, t, tx, y - 12.5, TAMANHO, fonte);
        x += larguras[i];
      });
      y -= ALTURA_LINHA;
      pagina.drawLine({
        start: { x: MARGEM, y },
        end: { x: MARGEM + larguraUtil, y },
        thickness: 0.5,
        color: COR.marca100,
      });
    });
  }

  // Rodapé com a data e o número da página, em todas as páginas.
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: MARGEM, y: MARGEM + 10 }, end: { x: LARGURA - MARGEM, y: MARGEM + 10 }, thickness: 0.5, color: COR.marca100 });
    escrever(p, dados.rodape, MARGEM, MARGEM - 2, 7.5, normal, COR.cinza);
    const numero = `Página ${i + 1} de ${paginas.length}`;
    escrever(p, numero, LARGURA - MARGEM - normal.widthOfTextAtSize(textoSeguro(numero), 7.5), MARGEM - 2, 7.5, normal, COR.cinza);
  });

  return pdf.save();
}
