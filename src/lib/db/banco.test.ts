import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { criarUsuario, entrar, existeUsuario, sair, usuarioDaSessao } from "../auth";
import { abrirBanco } from ".";

let db: DatabaseSync;
let usuarioId: number;

beforeEach(() => {
  db = abrirBanco(":memory:");
  usuarioId = criarUsuario(db, { nome: "Ana", email: "ana@exemplo.com", senha: "senha-forte", perfil: "almoxarife" });
  db.prepare("insert into obras (id, nome) values (1, 'Obra teste')").run();
  db.prepare("insert into materiais (id, nome, unidade) values (1, 'Cimento', 'saco')").run();
});

function lancar(tipo: string, quantidade: number) {
  db.prepare(
    "insert into movimentos (obra_id, material_id, tipo, quantidade, registrado_por) values (1, 1, ?, ?, ?)",
  ).run(tipo, quantidade, usuarioId);
}

function saldo(): number {
  const linha = db.prepare("select saldo from saldos where obra_id = 1 and material_id = 1").get() as
    | { saldo: number }
    | undefined;
  return linha?.saldo ?? 0;
}

describe("login", () => {
  it("entra com a senha certa e sai", () => {
    expect(existeUsuario(db)).toBe(true);
    const token = entrar(db, "ANA@exemplo.com", "senha-forte");
    expect(token).toBeTruthy();
    expect(usuarioDaSessao(db, token!)?.nome).toBe("Ana");
    sair(db, token!);
    expect(usuarioDaSessao(db, token!)).toBeNull();
  });

  it("recusa senha errada e usuário desativado", () => {
    expect(entrar(db, "ana@exemplo.com", "errada")).toBeNull();
    db.prepare("update usuarios set ativo = 0").run();
    expect(entrar(db, "ana@exemplo.com", "senha-forte")).toBeNull();
  });

  it("não guarda a senha em texto", () => {
    const linha = db.prepare("select senha_hash from usuarios").get() as { senha_hash: string };
    expect(linha.senha_hash).not.toContain("senha-forte");
  });
});

describe("movimentos", () => {
  it("calcula o saldo", () => {
    lancar("entrada", 10);
    lancar("saida", 4);
    lancar("correcao", -0.5);
    expect(saldo()).toBe(5.5);
  });

  it("não deixa sair mais do que tem", () => {
    lancar("entrada", 10);
    expect(() => lancar("saida", 10.5)).toThrow(/maior que o saldo/);
    lancar("saida", 10);
    expect(saldo()).toBe(0);
  });

  it("não deixa alterar nem apagar lançamentos", () => {
    lancar("entrada", 10);
    expect(() => db.prepare("update movimentos set quantidade = 99").run()).toThrow(/correção/);
    expect(() => db.prepare("delete from movimentos").run()).toThrow(/correção/);
  });
});
