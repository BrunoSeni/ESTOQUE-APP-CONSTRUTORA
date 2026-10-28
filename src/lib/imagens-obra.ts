import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

// Logo e foto da fachada de cada obra. Ficam como arquivos na pasta "dados/obras",
// no computador onde o app roda (nunca no GitHub). O nome do arquivo é "<id da obra>-<tipo>.<formato>".

export const TIPOS_IMAGEM = ["logo", "fachada"] as const;
export type TipoImagem = (typeof TIPOS_IMAGEM)[number];

export const LIMITE_IMAGEM_MB = 15;

const FORMATOS = [
  { ext: "png", mime: "image/png", assinatura: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg", mime: "image/jpeg", assinatura: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "webp", mime: "image/webp", assinatura: (b: Buffer) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
];

export function eTipoImagem(tipo: string): tipo is TipoImagem {
  return (TIPOS_IMAGEM as readonly string[]).includes(tipo);
}

// Confere pelo conteúdo do arquivo (e não pelo nome) se é uma foto que o navegador mostra.
export function conferirImagem(dados: Buffer): { erro: string } | { ext: string } {
  if (dados.length > LIMITE_IMAGEM_MB * 1024 * 1024) {
    return { erro: `A imagem é maior que ${LIMITE_IMAGEM_MB} MB. Diminua o tamanho da foto e tente de novo.` };
  }
  const formato = FORMATOS.find((f) => f.assinatura(dados));
  if (!formato) return { erro: "Use uma imagem PNG, JPG ou WEBP." };
  return { ext: formato.ext };
}

function arquivosDaObra(pasta: string, obraId: number, tipo: TipoImagem): string[] {
  let nomes: string[];
  try {
    nomes = readdirSync(pasta);
  } catch {
    return [];
  }
  return nomes.filter((n) => FORMATOS.some((f) => n === `${obraId}-${tipo}.${f.ext}`)).map((n) => path.join(pasta, n));
}

export function removerImagemObra(pasta: string, obraId: number, tipo: TipoImagem): void {
  for (const arquivo of arquivosDaObra(pasta, obraId, tipo)) rmSync(arquivo, { force: true });
}

export function guardarImagemObra(pasta: string, obraId: number, tipo: TipoImagem, dados: Buffer): { erro: string } | null {
  const r = conferirImagem(dados);
  if ("erro" in r) return r;
  mkdirSync(pasta, { recursive: true });
  removerImagemObra(pasta, obraId, tipo);
  writeFileSync(path.join(pasta, `${obraId}-${tipo}.${r.ext}`), dados);
  return null;
}

export function lerImagemObra(pasta: string, obraId: number, tipo: TipoImagem): { dados: Buffer; mime: string } | null {
  const arquivo = arquivosDaObra(pasta, obraId, tipo)[0];
  if (!arquivo) return null;
  const mime = FORMATOS.find((f) => arquivo.endsWith(`.${f.ext}`))!.mime;
  return { dados: readFileSync(arquivo), mime };
}

// Endereço de cada imagem para usar na tela, ou null se a obra não tem.
// O "v" muda quando a imagem é trocada, para o navegador não mostrar a antiga.
export function imagensDaObra(pasta: string, obraId: number): Record<TipoImagem, string | null> {
  const enderecos = {} as Record<TipoImagem, string | null>;
  for (const tipo of TIPOS_IMAGEM) {
    const arquivo = arquivosDaObra(pasta, obraId, tipo)[0];
    enderecos[tipo] = arquivo ? `/obras/${obraId}/imagem/${tipo}?v=${Math.round(statSync(arquivo).mtimeMs)}` : null;
  }
  return enderecos;
}
