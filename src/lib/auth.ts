import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export type Perfil = "almoxarife" | "engenheiro" | "escritorio" | "admin";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
};

export const COOKIE_SESSAO = "sessao";
const DIAS_SESSAO = 30;

// A senha nunca é guardada: só um "resumo" (hash) que não dá para desfazer.
export function gerarHashSenha(senha: string): string {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, sal, 64).toString("hex");
  return `${sal}:${hash}`;
}

export function conferirSenha(senha: string, guardado: string): boolean {
  const [sal, hash] = guardado.split(":");
  if (!sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const recebido = scryptSync(senha, sal, esperado.length);
  return timingSafeEqual(esperado, recebido);
}

export function existeUsuario(db: DatabaseSync): boolean {
  return db.prepare("select 1 from usuarios limit 1").get() !== undefined;
}

export function criarUsuario(
  db: DatabaseSync,
  dados: { nome: string; email: string; senha: string; perfil: Perfil },
): number {
  const r = db
    .prepare("insert into usuarios (nome, email, senha_hash, perfil) values (?, ?, ?, ?)")
    .run(dados.nome.trim(), dados.email.trim(), gerarHashSenha(dados.senha), dados.perfil);
  return Number(r.lastInsertRowid);
}

// Confere e-mail e senha e abre uma sessão. Devolve o token da sessão, ou null.
export function entrar(db: DatabaseSync, email: string, senha: string): string | null {
  const linha = db
    .prepare("select id, senha_hash from usuarios where email = ? and ativo = 1")
    .get(email.trim()) as { id: number; senha_hash: string } | undefined;
  if (!linha || !conferirSenha(senha, linha.senha_hash)) return null;

  const token = randomBytes(32).toString("hex");
  db.prepare(
    `insert into sessoes (token, usuario_id, expira_em) values (?, ?, datetime('now', '+${DIAS_SESSAO} days'))`,
  ).run(token, linha.id);
  return token;
}

export function usuarioDaSessao(db: DatabaseSync, token: string | undefined): Usuario | null {
  if (!token) return null;
  const linha = db
    .prepare(
      `select u.id, u.nome, u.email, u.perfil from sessoes s
       join usuarios u on u.id = s.usuario_id
       where s.token = ? and s.expira_em > datetime('now') and u.ativo = 1`,
    )
    .get(token) as Usuario | undefined;
  return linha ?? null;
}

export function sair(db: DatabaseSync, token: string): void {
  db.prepare("delete from sessoes where token = ?").run(token);
}

export const DURACAO_SESSAO_SEGUNDOS = DIAS_SESSAO * 24 * 60 * 60;
