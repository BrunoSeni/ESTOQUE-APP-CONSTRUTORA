"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ativarMaterial,
  ativarUsuario,
  encerrarObra,
  importarMateriais,
  salvarMaterial,
  salvarObra,
  salvarUsuario,
  type ResultadoImportacao,
} from "@/lib/cadastros";
import { banco } from "@/lib/db";
import { lerPlanilha } from "@/lib/planilha";
import { COOKIE_OBRA, exigirAdmin, exigirUsuario, obraAtual } from "@/lib/sessao";

// Em caso de erro, o que foi digitado volta preenchido (menos senhas).
export type EstadoCadastro = { erro: string | null; valores?: Record<string, string | string[]> };

function texto(form: FormData, campo: string): string {
  return String(form.get(campo) ?? "");
}

function valores(form: FormData): Record<string, string | string[]> {
  const v: Record<string, string | string[]> = {};
  for (const chave of new Set(form.keys())) {
    if (chave.startsWith("$") || chave.includes("senha")) continue;
    const todos = form.getAll(chave).map(String);
    v[chave] = todos.length > 1 || chave === "obras" ? todos : todos[0];
  }
  return v;
}

export async function trocarObraAcao(obraId: number) {
  const usuario = await exigirUsuario();
  const { obras } = await obraAtual(usuario);
  if (!obras.some((o) => o.id === obraId)) return;
  (await cookies()).set(COOKIE_OBRA, String(obraId), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 24 * 60 * 60 });
}

// ---------- Obras ----------

export async function salvarObraAcao(id: number | null, _anterior: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  await exigirAdmin();
  const r = salvarObra(banco(), id, { nome: texto(form, "nome"), endereco: texto(form, "endereco") });
  if ("erro" in r) return { erro: r.erro, valores: valores(form) };
  redirect("/obras");
}

export async function encerrarObraAcao(id: number, encerrar: boolean): Promise<EstadoCadastro> {
  await exigirAdmin();
  encerrarObra(banco(), id, encerrar);
  redirect("/obras");
}

// ---------- Materiais ----------

export async function salvarMaterialAcao(id: number | null, _anterior: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  await exigirAdmin();
  const r = salvarMaterial(banco(), id, { nome: texto(form, "nome"), unidade: texto(form, "unidade") });
  if ("erro" in r) return { erro: r.erro, valores: valores(form) };
  redirect("/materiais");
}

export async function ativarMaterialAcao(id: number, ativo: boolean): Promise<EstadoCadastro> {
  await exigirAdmin();
  ativarMaterial(banco(), id, ativo);
  redirect("/materiais");
}

export type EstadoImportacao =
  | { etapa: "inicio"; erro?: string }
  | { etapa: "previa"; arquivo: string; resultado: ResultadoImportacao }
  | { etapa: "feito"; arquivo: string; resultado: ResultadoImportacao };

// Lê a planilha enviada. Em "conferir" só mostra o que vai acontecer; em "importar" grava.
// O arquivo não é guardado em lugar nenhum: só os materiais vão para o banco do app.
export async function importarPlanilhaAcao(form: FormData): Promise<EstadoImportacao> {
  await exigirAdmin();
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { etapa: "inicio", erro: "Escolha o arquivo da planilha." };

  const leitura = lerPlanilha(arquivo.name, Buffer.from(await arquivo.arrayBuffer()));
  if (!leitura.ok) return { etapa: "inicio", erro: leitura.erro };

  const gravar = form.get("modo") === "importar";
  const resultado = importarMateriais(banco(), leitura.linhas, gravar);
  return { etapa: gravar ? "feito" : "previa", arquivo: arquivo.name, resultado };
}

// ---------- Usuários ----------

export async function salvarUsuarioAcao(id: number | null, _anterior: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  await exigirAdmin();
  const r = salvarUsuario(banco(), id, {
    nome: texto(form, "nome"),
    email: texto(form, "email"),
    perfil: texto(form, "perfil"),
    senha: texto(form, "senha"),
    obras: form.getAll("obras").map(Number).filter(Number.isInteger),
  });
  if ("erro" in r) return { erro: r.erro, valores: valores(form) };
  redirect("/usuarios");
}

export async function ativarUsuarioAcao(id: number, ativo: boolean): Promise<EstadoCadastro> {
  await exigirAdmin();
  const r = ativarUsuario(banco(), id, ativo);
  if (r) return { erro: r.erro };
  redirect("/usuarios");
}
