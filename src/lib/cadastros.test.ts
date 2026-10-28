import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { criarUsuario, entrar, usuarioDaSessao } from "./auth";
import {
  ativarMaterial,
  ativarUsuario,
  buscarUsuario,
  encerrarObra,
  importarMateriais,
  listarMateriais,
  obrasDoUsuario,
  salvarMaterial,
  salvarObra,
  salvarUsuario,
} from "./cadastros";
import { abrirBanco } from "./db";

let db: DatabaseSync;
let adminId: number;

beforeEach(() => {
  db = abrirBanco(":memory:");
  adminId = criarUsuario(db, { nome: "Admin", email: "admin@exemplo.com", senha: "senha-forte", perfil: "admin" });
});

function id(r: { erro: string } | { id: number }): number {
  if ("erro" in r) throw new Error(r.erro);
  return r.id;
}

describe("obras", () => {
  it("cadastra, não repete nome e encerra", () => {
    const obra = id(salvarObra(db, null, { nome: "  Residencial   Teste ", endereco: "" }));
    expect(salvarObra(db, null, { nome: "residencial teste", endereco: "" })).toEqual({
      erro: "Já existe uma obra com esse nome.",
    });
    expect(salvarObra(db, null, { nome: " ", endereco: "" })).toHaveProperty("erro");

    const admin = usuarioDaSessao(db, entrar(db, "admin@exemplo.com", "senha-forte")!)!;
    expect(obrasDoUsuario(db, admin).map((o) => o.nome)).toEqual(["Residencial Teste"]);
    encerrarObra(db, obra, true);
    expect(obrasDoUsuario(db, admin)).toEqual([]);
  });

  it("almoxarife só vê as obras dele", () => {
    const a = id(salvarObra(db, null, { nome: "Obra A", endereco: "" }));
    id(salvarObra(db, null, { nome: "Obra B", endereco: "" }));
    const u = id(salvarUsuario(db, null, { nome: "Ana", email: "ana@exemplo.com", perfil: "almoxarife", senha: "12345678", obras: [a] }));
    expect(obrasDoUsuario(db, buscarUsuario(db, u)!).map((o) => o.nome)).toEqual(["Obra A"]);
  });
});

describe("materiais", () => {
  it("cadastra, busca sem acento e desativa", () => {
    const m = id(salvarMaterial(db, null, { nome: "Areia média", unidade: "m³" }));
    id(salvarMaterial(db, null, { nome: "Cimento CP II", unidade: "saco" }));
    expect(salvarMaterial(db, null, { nome: "AREIA MÉDIA", unidade: "M³" })).toHaveProperty("erro");
    expect(salvarMaterial(db, null, { nome: "Areia média", unidade: "" })).toHaveProperty("erro");

    expect(listarMateriais(db, { busca: "media areia" }).materiais.map((x) => x.nome)).toEqual(["Areia média"]);
    ativarMaterial(db, m, false);
    expect(listarMateriais(db).total).toBe(1);
    expect(listarMateriais(db, { incluirInativos: true }).total).toBe(2);
  });

  it("importa só o que é novo e aponta os problemas", () => {
    id(salvarMaterial(db, null, { nome: "Cimento CP II", unidade: "saco" }));
    const linhas = [
      { linha: 2, nome: "cimento cp ii", unidade: "SACO" },
      { linha: 3, nome: "Areia  média", unidade: "m³" },
      { linha: 4, nome: "Areia média", unidade: "m³" },
      { linha: 5, nome: "Prego", unidade: "" },
      { linha: 6, nome: "Brita 1", unidade: "m³" },
    ];

    const previa = importarMateriais(db, linhas, false);
    expect(previa).toEqual({
      novos: [
        { nome: "Areia média", unidade: "m³" },
        { nome: "Brita 1", unidade: "m³" },
      ],
      jaCadastrados: 1,
      repetidosNaPlanilha: 1,
      problemas: [{ linha: 5, motivo: '"Prego" está sem unidade' }],
    });
    expect(listarMateriais(db).total).toBe(1);

    importarMateriais(db, linhas, true);
    expect(listarMateriais(db).total).toBe(3);
    // Importar de novo não duplica nada.
    expect(importarMateriais(db, linhas, true).novos).toEqual([]);
    expect(listarMateriais(db).total).toBe(3);
  });
});

describe("usuários", () => {
  it("cria, edita, troca a senha e desativa", () => {
    const u = id(salvarUsuario(db, null, { nome: "Beto", email: "Beto@Exemplo.com", perfil: "engenheiro", senha: "12345678", obras: [] }));
    expect(salvarUsuario(db, null, { nome: "Outro", email: "beto@exemplo.com", perfil: "engenheiro", senha: "12345678", obras: [] })).toEqual({
      erro: "Já existe um usuário com esse e-mail.",
    });
    expect(salvarUsuario(db, null, { nome: "C", email: "c@exemplo.com", perfil: "engenheiro", senha: "123", obras: [] })).toHaveProperty("erro");

    const token = entrar(db, "beto@exemplo.com", "12345678")!;
    // Em branco, a senha não muda.
    id(salvarUsuario(db, u, { nome: "Beto Silva", email: "beto@exemplo.com", perfil: "escritorio", senha: "", obras: [] }));
    expect(usuarioDaSessao(db, token)?.perfil).toBe("escritorio");

    id(salvarUsuario(db, u, { nome: "Beto Silva", email: "beto@exemplo.com", perfil: "escritorio", senha: "nova-senha", obras: [] }));
    expect(usuarioDaSessao(db, token)).toBeNull();
    expect(entrar(db, "beto@exemplo.com", "nova-senha")).toBeTruthy();

    expect(ativarUsuario(db, u, false)).toBeNull();
    expect(entrar(db, "beto@exemplo.com", "nova-senha")).toBeNull();
  });

  it("não deixa o app ficar sem administrador", () => {
    expect(ativarUsuario(db, adminId, false)).toHaveProperty("erro");
    expect(
      salvarUsuario(db, adminId, { nome: "Admin", email: "admin@exemplo.com", perfil: "almoxarife", senha: "", obras: [] }),
    ).toHaveProperty("erro");
  });
});
