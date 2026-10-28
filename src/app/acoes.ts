"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_SESSAO,
  DURACAO_SESSAO_SEGUNDOS,
  criarUsuario,
  entrar,
  existeUsuario,
  sair,
} from "@/lib/auth";
import { banco } from "@/lib/db";

// Em caso de erro, os campos que não são senha voltam preenchidos,
// para a pessoa não ter que digitar de novo.
export type EstadoFormulario = { erro: string | null; valores?: Record<string, string> };

async function guardarSessao(token: string) {
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.ESTOQUE_HTTPS === "1",
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
}

export async function entrarAcao(
  _anterior: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const email = String(form.get("email") ?? "");
  const token = entrar(banco(), email, String(form.get("senha") ?? ""));
  if (!token) return { erro: "E-mail ou senha incorretos.", valores: { email } };
  await guardarSessao(token);
  redirect("/");
}

export async function sairAcao() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) sair(banco(), token);
  jar.delete(COOKIE_SESSAO);
  redirect("/login");
}

// Cria o primeiro administrador. Só funciona enquanto o app não tem nenhum usuário.
export async function primeiroAcessoAcao(
  _anterior: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const db = banco();
  if (existeUsuario(db)) redirect("/login");

  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  if (!nome || !email) return { erro: "Preencha nome e e-mail.", valores: { nome, email } };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres.", valores: { nome, email } };
  if (senha !== form.get("confirmacao")) return { erro: "As senhas não são iguais.", valores: { nome, email } };

  criarUsuario(db, { nome, email, senha, perfil: "admin" });
  const token = entrar(db, email, senha);
  if (token) await guardarSessao(token);
  redirect("/");
}
