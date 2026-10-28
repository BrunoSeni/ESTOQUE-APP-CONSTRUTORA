import { crc32, deflateRawSync } from "node:zlib";

// Monta uma planilha do Excel (.xlsx) para os relatórios. Não usa biblioteca de fora:
// o .xlsx é um arquivo compactado (zip) com textos em XML.

export type Celula = string | number | null;
export type Aba = { nome: string; colunas: string[]; linhas: Celula[][]; larguras?: number[] };

function xml(texto: string): string {
  return texto
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function letraColuna(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

function celula(valor: Celula, ref: string, estilo: number): string {
  if (valor === null || valor === "") return "";
  if (typeof valor === "number") return `<c r="${ref}" s="${estilo || 2}"><v>${valor}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${estilo ? ` s="${estilo}"` : ""}><is><t xml:space="preserve">${xml(valor)}</t></is></c>`;
}

function planilha(aba: Aba): string {
  const linhas = [aba.colunas, ...aba.linhas].map(
    (l, i) => `<row r="${i + 1}">${l.map((v, c) => celula(v, `${letraColuna(c)}${i + 1}`, i === 0 ? 1 : 0)).join("")}</row>`,
  );
  const larguras = aba.colunas
    .map((_, c) => `<col min="${c + 1}" max="${c + 1}" width="${aba.larguras?.[c] ?? 18}" customWidth="1"/>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    // Deixa o cabeçalho fixo ao rolar a planilha.
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${larguras}</cols><sheetData>${linhas.join("")}</sheetData>` +
    (aba.linhas.length ? `<autoFilter ref="A1:${letraColuna(aba.colunas.length - 1)}${aba.linhas.length + 1}"/>` : "") +
    `</worksheet>`
  );
}

// O nome da aba no Excel tem até 31 letras e não aceita alguns símbolos.
function nomeAba(nome: string): string {
  return nome.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Planilha";
}

export function gerarXlsx(abas: Aba[]): Buffer {
  const tipos =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    abas
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("") +
    `</Types>`;
  const relsRaiz =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;
  const livro =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
    abas.map((a, i) => `<sheet name="${xml(nomeAba(a.nome))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
    `</sheets></workbook>`;
  const relsLivro =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    abas
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("") +
    `<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;
  // Estilos: 0 = normal, 1 = cabeçalho em negrito com fundo cinza, 2 = número com até 3 casas.
  const estilos =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.###"/></numFmts>` +
    `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFE4E8EC"/></patternFill></fill></fills>` +
    `<borders count="1"><border/></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
    `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;

  return zip([
    ["[Content_Types].xml", tipos],
    ["_rels/.rels", relsRaiz],
    ["xl/workbook.xml", livro],
    ["xl/_rels/workbook.xml.rels", relsLivro],
    ["xl/styles.xml", estilos],
    ...abas.map((a, i) => [`xl/worksheets/sheet${i + 1}.xml`, planilha(a)] as [string, string]),
  ]);
}

function zip(arquivos: [string, string][]): Buffer {
  const locais: Buffer[] = [];
  const centrais: Buffer[] = [];
  let posicao = 0;
  for (const [nome, texto] of arquivos) {
    const dados = Buffer.from(texto, "utf8");
    const comprimido = deflateRawSync(dados);
    const nomeBuf = Buffer.from(nome, "utf8");
    const crc = crc32(dados);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // nomes em UTF-8
    local.writeUInt16LE(8, 8); // compactado (deflate)
    local.writeUInt16LE(0x21, 12); // data fixa: 01/01/1980
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nomeBuf.length, 26);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nomeBuf.length, 28);
    central.writeUInt32LE(posicao, 42);

    locais.push(local, nomeBuf, comprimido);
    centrais.push(central, nomeBuf);
    posicao += local.length + nomeBuf.length + comprimido.length;
  }
  const indice = Buffer.concat(centrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(arquivos.length, 8);
  fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(indice.length, 12);
  fim.writeUInt32LE(posicao, 16);
  return Buffer.concat([...locais, indice, fim]);
}
