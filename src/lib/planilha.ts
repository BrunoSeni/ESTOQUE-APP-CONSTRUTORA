import { inflateRawSync } from "node:zlib";

// Lê a planilha de insumos (Excel .xlsx ou .csv) e devolve nome e unidade de cada linha.
// Não usa biblioteca de fora: o .xlsx é um arquivo compactado (zip) com textos em XML.

export type LinhaPlanilha = { linha: number; nome: string; unidade: string };

export type ResultadoLeitura =
  | { ok: true; linhas: LinhaPlanilha[] }
  | { ok: false; erro: string };

export function lerPlanilha(nomeArquivo: string, conteudo: Buffer): ResultadoLeitura {
  const ext = nomeArquivo.toLowerCase().split(".").pop();
  let tabelas: string[][][];
  try {
    if (ext === "xlsx" || ext === "xlsm") tabelas = lerXlsx(conteudo);
    else if (ext === "csv" || ext === "txt") tabelas = [lerCsv(decodificarTexto(conteudo))];
    else if (ext === "xls") {
      return {
        ok: false,
        erro: 'Esse é o formato antigo do Excel (.xls). Abra no Excel e use "Salvar como" > "Pasta de Trabalho do Excel (.xlsx)".',
      };
    } else return { ok: false, erro: "Envie uma planilha do Excel (.xlsx) ou um arquivo .csv." };
  } catch {
    return { ok: false, erro: "Não foi possível ler o arquivo. Confira se é uma planilha do Excel (.xlsx) válida." };
  }

  // Usa a primeira aba que tiver as colunas de nome e unidade.
  for (const tabela of tabelas) {
    const achado = acharCabecalho(tabela);
    if (achado) return { ok: true, linhas: extrairLinhas(tabela, achado) };
  }
  return {
    ok: false,
    erro: 'Não achei as colunas da planilha. Ela precisa ter uma coluna com o nome do material (ex.: "Descrição", "Nome" ou "Insumo") e outra com a unidade (ex.: "Unidade" ou "Und").',
  };
}

type Cabecalho = { linha: number; nome: number; unidade: number };

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function colunaNome(celulas: string[]): number {
  const n = celulas.map(normalizar);
  const preferencias = [
    (c: string) => c.includes("descri") && !c.includes("unid"),
    (c: string) => c === "nome" || c.startsWith("nome "),
    (c: string) => (c.includes("insumo") || c.includes("material")) && !c.includes("cod"),
  ];
  for (const p of preferencias) {
    const i = n.findIndex(p);
    if (i >= 0) return i;
  }
  return -1;
}

function colunaUnidade(celulas: string[]): number {
  return celulas
    .map(normalizar)
    .findIndex((c) => c.startsWith("unid") || ["un", "und", "u m", "um", "unid"].includes(c));
}

function acharCabecalho(tabela: string[][]): Cabecalho | null {
  // O cabeçalho pode não estar na primeira linha (às vezes há um título em cima).
  for (let i = 0; i < Math.min(tabela.length, 30); i++) {
    const nome = colunaNome(tabela[i]);
    const unidade = colunaUnidade(tabela[i]);
    if (nome >= 0 && unidade >= 0 && nome !== unidade) return { linha: i, nome, unidade };
  }
  return null;
}

function extrairLinhas(tabela: string[][], cab: Cabecalho): LinhaPlanilha[] {
  const linhas: LinhaPlanilha[] = [];
  for (let i = cab.linha + 1; i < tabela.length; i++) {
    const nome = (tabela[i][cab.nome] ?? "").trim();
    const unidade = (tabela[i][cab.unidade] ?? "").trim();
    if (!nome && !unidade) continue;
    linhas.push({ linha: i + 1, nome, unidade });
  }
  return linhas;
}

// ---------- CSV ----------

function decodificarTexto(conteudo: Buffer): string {
  const utf8 = new TextDecoder("utf-8").decode(conteudo);
  // O Excel no Windows costuma salvar CSV em "windows-1252" (acentos viram �).
  const texto = utf8.includes("�") ? new TextDecoder("windows-1252").decode(conteudo) : utf8;
  return texto.replace(/^﻿/, "");
}

export function lerCsv(texto: string): string[][] {
  const primeira = texto.split(/\r?\n/, 1)[0] ?? "";
  const separador = [";", "\t", ","].reduce((a, b) =>
    primeira.split(b).length > primeira.split(a).length ? b : a,
  );

  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === separador) {
      linha.push(campo);
      campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

// ---------- XLSX ----------

function lerZip(buf: Buffer): Map<string, Buffer> {
  // O índice do zip fica no fim do arquivo.
  let fim = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new Error("zip inválido");

  const arquivos = new Map<string, Buffer>();
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("zip inválido");
    const metodo = buf.readUInt16LE(p + 10);
    const tamanho = buf.readUInt32LE(p + 20);
    const tamNome = buf.readUInt16LE(p + 28);
    const tamExtra = buf.readUInt16LE(p + 30);
    const tamComentario = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.toString("utf8", p + 46, p + 46 + tamNome);

    const inicio = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const dados = buf.subarray(inicio, inicio + tamanho);
    if (metodo === 0) arquivos.set(nome, dados);
    else if (metodo === 8) arquivos.set(nome, inflateRawSync(dados));

    p += 46 + tamNome + tamExtra + tamComentario;
  }
  return arquivos;
}

function decodificarXml(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    const nomes: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    if (e[0] !== "#") return nomes[e.toLowerCase()];
    return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });
}

// Junta os pedaços de texto de uma célula (o Excel quebra textos formatados em partes).
function textoDe(xml: string): string {
  const semFonetica = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  let texto = "";
  for (const m of semFonetica.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) texto += m[1];
  return decodificarXml(texto);
}

function indiceColuna(ref: string): number {
  let n = 0;
  for (const c of ref.replace(/\d+$/, "").toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

function lerXlsx(conteudo: Buffer): string[][][] {
  const zip = lerZip(conteudo);
  const texto = (nome: string) => zip.get(nome)?.toString("utf8") ?? "";

  const compartilhados = [...texto("xl/sharedStrings.xml").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) =>
    textoDe(m[1]),
  );

  // Abas na ordem em que aparecem no Excel.
  const destinos = new Map<string, string>();
  for (const m of texto("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0])?.[1];
    const alvo = /\bTarget="([^"]+)"/.exec(m[0])?.[1];
    if (id && alvo) destinos.set(id, alvo.startsWith("/") ? alvo.slice(1) : `xl/${alvo}`);
  }
  const abas = [...texto("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)]
    .map((m) => destinos.get(/\br:id="([^"]+)"/.exec(m[0])?.[1] ?? ""))
    .filter((a): a is string => !!a && zip.has(a));
  if (abas.length === 0) abas.push(...[...zip.keys()].filter((k) => /^xl\/worksheets\/[^/]+\.xml$/.test(k)).sort());

  return abas.map((aba) => {
    const tabela: string[][] = [];
    for (const r of texto(aba).matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const num = Number(/\br="(\d+)"/.exec(r[1])?.[1] ?? tabela.length + 1);
      const linha: string[] = [];
      let proxima = 0;
      for (const c of (r[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = /\br="([A-Z]+\d*)"/i.exec(c[1])?.[1];
        const col = ref ? indiceColuna(ref) : proxima;
        proxima = col + 1;
        const tipo = /\bt="([^"]+)"/.exec(c[1])?.[1];
        const corpo = c[2] ?? "";
        const v = /<v>([\s\S]*?)<\/v>/.exec(corpo)?.[1];
        let valor = "";
        if (tipo === "s") valor = compartilhados[Number(v)] ?? "";
        else if (tipo === "inlineStr") valor = textoDe(corpo);
        else if (v !== undefined) valor = decodificarXml(v);
        linha[col] = valor;
      }
      tabela[num - 1] = Array.from(linha, (v) => v ?? "");
    }
    return Array.from(tabela, (l) => l ?? []);
  });
}
