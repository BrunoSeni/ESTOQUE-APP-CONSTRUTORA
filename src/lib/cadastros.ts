import type { DatabaseSync } from "node:sqlite";
import { gerarHashSenha, type Perfil, type Usuario } from "./auth";
import type { LinhaPlanilha } from "./planilha";

// Cadastros de obras, materiais e usuários. Funções puras sobre o banco, para poder testar.

// Tira espaços repetidos e nas pontas ("  Cimento   CP II " -> "Cimento CP II").
export function limparTexto(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

// ---------- Obras ----------

export type Obra = { id: number; nome: string; endereco: string | null; encerrada_em: string | null };

export function listarObras(db: DatabaseSync): Obra[] {
  return db
    .prepare("select id, nome, endereco, encerrada_em from obras order by encerrada_em is not null, nome collate nocase")
    .all() as Obra[];
}

export function buscarObra(db: DatabaseSync, id: number): Obra | null {
  return (db.prepare("select id, nome, endereco, encerrada_em from obras where id = ?").get(id) as Obra) ?? null;
}

// Obras em andamento que a pessoa pode ver. Escritório e administrador veem todas.
export function obrasDoUsuario(db: DatabaseSync, usuario: Usuario): Obra[] {
  if (usuario.perfil === "admin" || usuario.perfil === "escritorio") {
    return listarObras(db).filter((o) => !o.encerrada_em);
  }
  return db
    .prepare(
      `select o.id, o.nome, o.endereco, o.encerrada_em from obras o
       join usuarios_obras uo on uo.obra_id = o.id
       where uo.usuario_id = ? and o.encerrada_em is null
       order by o.nome collate nocase`,
    )
    .all(usuario.id) as Obra[];
}

export function salvarObra(
  db: DatabaseSync,
  id: number | null,
  dados: { nome: string; endereco: string },
): { erro: string } | { id: number } {
  const nome = limparTexto(dados.nome);
  const endereco = limparTexto(dados.endereco) || null;
  if (!nome) return { erro: "Informe o nome da obra." };
  const repetida = listarObras(db).some((o) => o.id !== id && semAcento(o.nome) === semAcento(nome));
  if (repetida) return { erro: "Já existe uma obra com esse nome." };

  if (id === null) {
    const r = db.prepare("insert into obras (nome, endereco) values (?, ?)").run(nome, endereco);
    return { id: Number(r.lastInsertRowid) };
  }
  db.prepare("update obras set nome = ?, endereco = ? where id = ?").run(nome, endereco, id);
  return { id };
}

export function encerrarObra(db: DatabaseSync, id: number, encerrar: boolean): void {
  db.prepare(`update obras set encerrada_em = ${encerrar ? "datetime('now')" : "null"} where id = ?`).run(id);
}

// ---------- Materiais ----------

export type Material = { id: number; nome: string; unidade: string; ativo: number };

export const LIMITE_LISTA_MATERIAIS = 200;

// Busca pelo nome; cada palavra digitada precisa aparecer (em qualquer ordem, sem ligar para acento).
export function listarMateriais(
  db: DatabaseSync,
  opcoes: { busca?: string; incluirInativos?: boolean } = {},
): { materiais: Material[]; total: number } {
  const palavras = semAcento(limparTexto(opcoes.busca ?? "")).split(" ").filter(Boolean);
  const todos = db
    .prepare(
      `select id, nome, unidade, ativo from materiais
       ${opcoes.incluirInativos ? "" : "where ativo = 1"}
       order by nome collate nocase`,
    )
    .all() as Material[];
  const achados = palavras.length
    ? todos.filter((m) => {
        const nome = semAcento(m.nome);
        return palavras.every((p) => nome.includes(p));
      })
    : todos;
  return { materiais: achados.slice(0, LIMITE_LISTA_MATERIAIS), total: achados.length };
}

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Dois materiais são o mesmo quando nome e unidade batem, sem ligar para maiúsculas, acentos e espaços.
function chaveMaterial(nome: string, unidade: string): string {
  return `${semAcento(limparTexto(nome))}|${semAcento(limparTexto(unidade))}`;
}

export function buscarMaterial(db: DatabaseSync, id: number): Material | null {
  return (db.prepare("select id, nome, unidade, ativo from materiais where id = ?").get(id) as Material) ?? null;
}

export function contarMateriais(db: DatabaseSync): number {
  return (db.prepare("select count(*) as n from materiais where ativo = 1").get() as { n: number }).n;
}

export function salvarMaterial(
  db: DatabaseSync,
  id: number | null,
  dados: { nome: string; unidade: string },
): { erro: string } | { id: number } {
  const nome = limparTexto(dados.nome);
  const unidade = limparTexto(dados.unidade);
  if (!nome) return { erro: "Informe o nome do material." };
  if (!unidade) return { erro: "Informe a unidade de medida (ex.: saco, m³, barra, un)." };
  const chave = chaveMaterial(nome, unidade);
  const repetido = (db.prepare("select id, nome, unidade from materiais").all() as Material[]).some(
    (m) => m.id !== id && chaveMaterial(m.nome, m.unidade) === chave,
  );
  if (repetido) return { erro: "Já existe um material com esse nome e essa unidade." };

  if (id === null) {
    const r = db.prepare("insert into materiais (nome, unidade) values (?, ?)").run(nome, unidade);
    return { id: Number(r.lastInsertRowid) };
  }
  db.prepare("update materiais set nome = ?, unidade = ? where id = ?").run(nome, unidade, id);
  return { id };
}

export function ativarMaterial(db: DatabaseSync, id: number, ativo: boolean): void {
  db.prepare("update materiais set ativo = ? where id = ?").run(ativo ? 1 : 0, id);
}

export type ResultadoImportacao = {
  novos: { nome: string; unidade: string }[];
  jaCadastrados: number;
  repetidosNaPlanilha: number;
  problemas: { linha: number; motivo: string }[];
};

// Confere a planilha contra o cadastro. Com gravar = true, inclui os materiais novos.
// Materiais que já existem (mesmo nome e unidade) não são duplicados nem alterados.
export function importarMateriais(
  db: DatabaseSync,
  linhas: LinhaPlanilha[],
  gravar: boolean,
): ResultadoImportacao {
  const existentes = new Set(
    (db.prepare("select nome, unidade from materiais").all() as { nome: string; unidade: string }[]).map((m) =>
      chaveMaterial(m.nome, m.unidade),
    ),
  );
  const resultado: ResultadoImportacao = { novos: [], jaCadastrados: 0, repetidosNaPlanilha: 0, problemas: [] };
  const vistos = new Set<string>();

  for (const l of linhas) {
    const nome = limparTexto(l.nome);
    const unidade = limparTexto(l.unidade);
    if (!nome) {
      resultado.problemas.push({ linha: l.linha, motivo: "sem nome do material" });
      continue;
    }
    if (!unidade) {
      resultado.problemas.push({ linha: l.linha, motivo: `"${nome}" está sem unidade` });
      continue;
    }
    const k = chaveMaterial(nome, unidade);
    if (existentes.has(k)) resultado.jaCadastrados++;
    else if (vistos.has(k)) resultado.repetidosNaPlanilha++;
    else resultado.novos.push({ nome, unidade });
    vistos.add(k);
  }

  if (gravar && resultado.novos.length) {
    const inserir = db.prepare("insert into materiais (nome, unidade) values (?, ?)");
    db.exec("begin");
    try {
      for (const m of resultado.novos) inserir.run(m.nome, m.unidade);
      db.exec("commit");
    } catch (e) {
      db.exec("rollback");
      throw e;
    }
  }
  return resultado;
}

// ---------- Usuários ----------

export const PERFIS: { valor: Perfil; nome: string; descricao: string }[] = [
  { valor: "almoxarife", nome: "Almoxarife", descricao: "Lança entradas, saídas e transferências das suas obras." },
  { valor: "engenheiro", nome: "Engenheiro / mestre de obras", descricao: "Consulta o saldo e o histórico das suas obras." },
  { valor: "escritorio", nome: "Escritório / compras", descricao: "Vê todas as obras, o histórico e os relatórios." },
  { valor: "admin", nome: "Administrador", descricao: "Faz tudo, inclusive os cadastros e os usuários." },
];

export function nomePerfil(perfil: Perfil): string {
  return PERFIS.find((p) => p.valor === perfil)?.nome ?? perfil;
}

export type UsuarioCadastro = Usuario & { ativo: number; obras: number[] };

export function listarUsuarios(db: DatabaseSync): UsuarioCadastro[] {
  const usuarios = db
    .prepare("select id, nome, email, perfil, ativo from usuarios order by ativo desc, nome collate nocase")
    .all() as (Usuario & { ativo: number })[];
  const vinculos = db.prepare("select usuario_id, obra_id from usuarios_obras").all() as {
    usuario_id: number;
    obra_id: number;
  }[];
  return usuarios.map((u) => ({
    ...u,
    obras: vinculos.filter((v) => v.usuario_id === u.id).map((v) => v.obra_id),
  }));
}

export function buscarUsuario(db: DatabaseSync, id: number): UsuarioCadastro | null {
  return listarUsuarios(db).find((u) => u.id === id) ?? null;
}

function outrosAdminsAtivos(db: DatabaseSync, id: number): number {
  return (
    db.prepare("select count(*) as n from usuarios where perfil = 'admin' and ativo = 1 and id <> ?").get(id) as {
      n: number;
    }
  ).n;
}

export function salvarUsuario(
  db: DatabaseSync,
  id: number | null,
  dados: { nome: string; email: string; perfil: string; senha: string; obras: number[] },
): { erro: string } | { id: number } {
  const nome = limparTexto(dados.nome);
  const email = dados.email.trim().toLowerCase();
  const perfil = PERFIS.find((p) => p.valor === dados.perfil)?.valor;
  if (!nome) return { erro: "Informe o nome." };
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return { erro: "Informe um e-mail válido." };
  if (!perfil) return { erro: "Escolha o perfil." };
  if (id === null && dados.senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (id !== null && dados.senha && dados.senha.length < 8) {
    return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  }
  const repetido = db.prepare("select 1 from usuarios where email = ? and id <> ?").get(email, id ?? 0);
  if (repetido) return { erro: "Já existe um usuário com esse e-mail." };
  if (id !== null && perfil !== "admin") {
    const atual = buscarUsuario(db, id);
    if (atual?.perfil === "admin" && atual.ativo && outrosAdminsAtivos(db, id) === 0) {
      return { erro: "Essa é a única pessoa administradora. Crie outro administrador antes de mudar o perfil." };
    }
  }

  db.exec("begin");
  try {
    let usuarioId: number;
    if (id === null) {
      const r = db
        .prepare("insert into usuarios (nome, email, senha_hash, perfil) values (?, ?, ?, ?)")
        .run(nome, email, gerarHashSenha(dados.senha), perfil);
      usuarioId = Number(r.lastInsertRowid);
    } else {
      usuarioId = id;
      db.prepare("update usuarios set nome = ?, email = ?, perfil = ? where id = ?").run(nome, email, perfil, id);
      if (dados.senha) {
        db.prepare("update usuarios set senha_hash = ? where id = ?").run(gerarHashSenha(dados.senha), id);
        // Quem estava conectado com a senha antiga precisa entrar de novo.
        db.prepare("delete from sessoes where usuario_id = ?").run(id);
      }
    }
    db.prepare("delete from usuarios_obras where usuario_id = ?").run(usuarioId);
    const vincular = db.prepare("insert or ignore into usuarios_obras (usuario_id, obra_id) values (?, ?)");
    for (const obraId of dados.obras) vincular.run(usuarioId, obraId);
    db.exec("commit");
    return { id: usuarioId };
  } catch (e) {
    db.exec("rollback");
    throw e;
  }
}

export function ativarUsuario(db: DatabaseSync, id: number, ativo: boolean): { erro: string } | null {
  if (!ativo) {
    const atual = buscarUsuario(db, id);
    if (atual?.perfil === "admin" && outrosAdminsAtivos(db, id) === 0) {
      return { erro: "Não dá para desativar a única pessoa administradora." };
    }
  }
  db.prepare("update usuarios set ativo = ? where id = ?").run(ativo ? 1 : 0, id);
  if (!ativo) db.prepare("delete from sessoes where usuario_id = ?").run(id);
  return null;
}
