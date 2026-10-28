import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA } from "./schema";

// O banco é um arquivo no computador (pasta "dados", fora do GitHub).
const ARQUIVO = process.env.ESTOQUE_DB ?? path.join(process.cwd(), "dados", "estoque.db");

export function abrirBanco(arquivo: string): DatabaseSync {
  if (arquivo !== ":memory:") mkdirSync(path.dirname(arquivo), { recursive: true });
  const db = new DatabaseSync(arquivo);
  db.exec(SCHEMA);
  return db;
}

// Uma conexão só para o app inteiro (guardada no globalThis para sobreviver ao recarregar no modo dev).
const global = globalThis as unknown as { estoqueDb?: DatabaseSync };

export function banco(): DatabaseSync {
  global.estoqueDb ??= abrirBanco(ARQUIVO);
  return global.estoqueDb;
}
