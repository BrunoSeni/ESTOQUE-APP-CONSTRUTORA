import type { DatabaseSync } from "node:sqlite";
import { listarObras, PERFIS } from "@/lib/cadastros";
import type { CampoCadastro } from "../formulario-cadastro";

export function camposUsuario(db: DatabaseSync, novo: boolean): CampoCadastro[] {
  return [
    { nome: "nome", rotulo: "Nome", tipo: "text", obrigatorio: true },
    { nome: "email", rotulo: "E-mail (usado para entrar)", tipo: "email", obrigatorio: true },
    {
      nome: "senha",
      rotulo: novo ? "Senha (mínimo 8 caracteres)" : "Nova senha",
      tipo: "password",
      obrigatorio: novo,
      autoComplete: "new-password",
      ajuda: novo
        ? "Passe a senha para a pessoa. Depois você pode trocar aqui."
        : "Deixe em branco para manter a senha atual.",
    },
    {
      nome: "perfil",
      rotulo: "Perfil",
      tipo: "escolha",
      obrigatorio: true,
      opcoes: PERFIS.map((p) => ({ valor: p.valor, rotulo: p.nome, ajuda: p.descricao })),
    },
    {
      nome: "obras",
      rotulo: "Obras",
      tipo: "marcar",
      ajuda: "Quais obras a pessoa enxerga. Escritório e administrador veem todas.",
      opcoes: listarObras(db)
        .filter((o) => !o.encerrada_em)
        .map((o) => ({ valor: String(o.id), rotulo: o.nome })),
    },
  ];
}
